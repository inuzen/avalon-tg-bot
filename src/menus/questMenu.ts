import { MyContext, ROLE_LIST, SIDES } from '../types';
import { Menu } from '@grammyjs/menu';
import { getPlayerRef } from '../utils/utils';
import { getEndGameMessage } from '../utils/textUtils';
import { assassinMenu } from './assassinMenu';
import { messageBuilder } from '../utils/textUtils';
import { QUESTS } from '../engine/engine';

export const questMenu = new Menu<MyContext>('quest-menu')
    .text('Success!', async (ctx, next) => {
        await countQuestVote(ctx, true);
        await next();
    })
    .row()
    .text('Fail!', async (ctx, next) => {
        await countQuestVote(ctx, false);
        await next();
    });

// TODO Probably have to change this to /yes and /no commands
const countQuestVote = async (ctx: MyContext, vote: boolean) => {
    if (ctx.session.game.votingArray.find((v) => v.player?.telegramId === ctx.from?.id)) {
        return;
    }
    const { nominatedPlayers, allPlayers, currentQuest } = ctx.session.game;

    if (ctx.session.game.nominatedPlayers.some((el) => el.telegramId === ctx.from?.id)) {
        ctx.session.game.votingArray.push({ vote });
    }
    // something wrong - nominated players cleared too early
    await ctx.editMessageText(
        `The outcome of the quest depends on ${nominatedPlayers.map(getPlayerRef).join(', ')}. \n${
            ctx.session.game.votingArray.length
        } out of ${nominatedPlayers.length} voted`,
    );
    // TODO add a warning on 4th quest for evil
    if (nominatedPlayers.length === ctx.session.game.votingArray.length) {
        const voteFailed =
            currentQuest === 4
                ? ctx.session.game.votingArray.filter((el) => !el.vote).length < 2
                : ctx.session.game.votingArray.some((el) => !el.vote);
        voteFailed ? (ctx.session.game.evilScore += 1) : (ctx.session.game.goodScore += 1);

        await ctx.reply(`The quest has ${voteFailed ? 'Failed!' : 'Succeeded'}`);

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
    }
};
