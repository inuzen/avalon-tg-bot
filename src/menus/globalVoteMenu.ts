import { getEndGameMessage, getVoteSuccessMsg, messageBuilder } from './../utils/textUtils';
import { Player, MyContext, SIDES } from '../types';
import { Menu } from '@grammyjs/menu';
import { getPlayerRef, checkForEveryoneAndRenderResults } from '../utils/utils';
import { getPartyVoteText } from '../utils/textUtils';
import { questMenu } from './questMenu';
import { QUESTS } from '../engine/engine';

const countGlobalVote = async (ctx: MyContext, vote: boolean) => {
    const { allPlayers, nominatedPlayers } = ctx.session.game;
    if (ctx.session.game.votingArray.find((pl) => pl.player?.telegramId === ctx.from?.id)) {
        await ctx.answerCallbackQuery("You've already voted!");
        return;
    }
    ctx.session.game.votingArray.push({
        vote,
        player: allPlayers.find((pl) => pl.telegramId === ctx.from?.id) as Player,
    });
    await ctx.editMessageText(
        getPartyVoteText(nominatedPlayers, ctx.session.game.votingArray.length, allPlayers.length),
    );
    await ctx.answerCallbackQuery('Your vote is added');
};

const resume = async (ctx: MyContext) => {
    const { allPlayers, nominatedPlayers, currentLeader } = ctx.session.game;
    if (ctx.from?.id !== currentLeader?.telegramId) {
        await ctx.answerCallbackQuery('Only current leader can resume');
        return;
    }

    const voteResultList = checkForEveryoneAndRenderResults(allPlayers, ctx.session.game.votingArray);

    if (voteResultList) {
        // @ts-ignore
        await ctx.menu.close();
        // TODO maybe edit old message instead of a new one
        await ctx.reply(voteResultList);

        const votePassed =
            ctx.session.game.votingArray.reduce((acc, vote) => {
                return vote.vote ? (acc += 1) : (acc -= 1);
            }, 0) > 0;

        ctx.session.game.votingArray = [];

        if (votePassed) {
            ctx.session.game.missedVotes = 0;
            await ctx.reply(getVoteSuccessMsg(nominatedPlayers, 0), {
                reply_markup: questMenu,
            });
        } else {
            ctx.session.game.missedVotes += 1;
            ctx.session.game.nominatedPlayers = [];
            ctx.session.game.partySize = QUESTS[allPlayers.length][ctx.session.game.currentQuest - 1];

            await ctx.reply(
                messageBuilder(
                    '‼️ Vote Failed ‼️',
                    '',
                    'If you fail to go on a quest 5 times in a row then EVIL wins!',
                    '',
                    `Missed votes in a row: ${ctx.session.game.missedVotes}`,
                ),
            );
            if (ctx.session.game.missedVotes === 5) {
                await ctx.reply(getEndGameMessage(allPlayers, SIDES.EVIL), {
                    parse_mode: 'HTML',
                });
            } else {
                // TODO Replace continue command with a button in both places
                await ctx.reply(`Discuss what happened and then the leader can /continue when ready`);
            }
        }
    }
};

export const globalVoteMenu = new Menu<MyContext>('global-vote', { autoAnswer: false })
    .text('Yes, i trust them completely 👍', async (ctx, next) => {
        await countGlobalVote(ctx, true);
        await next();
    })
    .row()
    .text("No, i don't think this is a good idea 👎", async (ctx, next) => {
        await countGlobalVote(ctx, false);
        await next();
    })
    .row()
    .text('Continue', resume);
