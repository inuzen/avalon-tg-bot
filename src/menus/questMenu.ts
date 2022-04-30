import { MyContext, ROLE_LIST, SIDES } from '../types';
import { Menu } from '@grammyjs/menu';
import { getPlayerRef } from '../utils/utils';
import { getEndGameMessage, getVoteSuccessMsg, renderQuestHistory } from '../utils/textUtils';
import { assassinMenu } from './assassinMenu';
import { messageBuilder } from '../utils/textUtils';
import { QUESTS } from '../engine/engine';

export const questMenu = new Menu<MyContext>('quest-menu', { autoAnswer: false })
    .text('Success!', async (ctx, next) => {
        await countQuestVote(ctx, true);
        await next();
    })
    .row()
    .text('Fail!', async (ctx, next) => {
        await countQuestVote(ctx, false);
        await next();
    })
    .row();

const countQuestVote = async (ctx: MyContext, vote: boolean) => {
    if (ctx.session.game.votingArray.find((v) => v.player?.telegramId === ctx.from?.id)) {
        await ctx.answerCallbackQuery("You've already voted");
        return;
    }
    const { nominatedPlayers } = ctx.session.game;

    if (ctx.session.game.nominatedPlayers.some((el) => el.telegramId === ctx.from?.id)) {
        ctx.session.game.votingArray.push({ vote });
        await ctx.answerCallbackQuery('Vote accepted');
    } else {
        await ctx.answerCallbackQuery('You are not in the party!');
        return;
    }
    await ctx.editMessageText(getVoteSuccessMsg(nominatedPlayers, ctx.session.game.votingArray.length));
};

questMenu.text(
    (ctx) => {
        const { nominatedPlayers, votingArray } = ctx.session.game;
        const locked = nominatedPlayers.length !== votingArray.length;
        return `Reveal results ${locked ? '🔒' : ''}`;
    },
    async (ctx, next) => {
        const { nominatedPlayers, allPlayers, currentLeader, currentQuest } = ctx.session.game;
        if (ctx.from.id !== currentLeader?.telegramId) {
            ctx.answerCallbackQuery('Only leader can reveal results');
            return;
        }
        // TODO they might both be 0
        if (nominatedPlayers.length !== ctx.session.game.votingArray.length) {
            await ctx.answerCallbackQuery('Not enough players voted');
            return;
        }

        const voteFailed =
            currentQuest === 4
                ? ctx.session.game.votingArray.filter((el) => !el.vote).length < 2
                : ctx.session.game.votingArray.some((el) => !el.vote);
        voteFailed ? (ctx.session.game.evilScore += 1) : (ctx.session.game.goodScore += 1);
        ctx.session.game.questHistory[currentQuest] = !voteFailed;

        await ctx.reply(
            messageBuilder(
                `${voteFailed ? '❗' : '✅'} The quest has ${voteFailed ? 'Failed!' : 'Succeeded'}`,
                renderQuestHistory(ctx.session.game.questHistory),
            ),
        );

        if (ctx.session.game.evilScore === 3) {
            await ctx.reply(getEndGameMessage(allPlayers, SIDES.EVIL), {
                parse_mode: 'HTML',
            });
        } else if (ctx.session.game.goodScore === 3) {
            await ctx.reply(
                messageBuilder(
                    'Good wins... but not just yet!',
                    'Evil has last chance to snatch the victory!',
                    `If Assassin ${getPlayerRef(
                        allPlayers.find((pl) => pl.role?.key === ROLE_LIST.ASSASSIN),
                    )} kills Merlin then Evil will triumph!`,
                    'Please select who you think is Merlin ⬇️',
                ),
                { reply_markup: assassinMenu, parse_mode: 'HTML' },
            );
        } else {
            ctx.session.game.votingArray = [];
            ctx.session.game.currentQuest += 1;
            ctx.session.game.nominatedPlayers = [];
            ctx.session.game.partySize = QUESTS[allPlayers.length][ctx.session.game.currentQuest - 1];
            await ctx.reply(`Discuss what happened and then the leader can /continue when ready`);
        }

        // @ts-ignore
        await ctx.menu.close();

        await next();
    },
);
