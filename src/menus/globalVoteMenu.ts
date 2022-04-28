import { getEndGameMessage, messageBuilder } from './../utils/textUtils';
import { Player, MyContext, SIDES } from '../types';
import { Menu } from '@grammyjs/menu';
import { getPlayerRef, checkForEveryoneAndRenderResults } from '../utils/utils';
import { getPartyVoteText } from '../utils/textUtils';
import { questMenu } from './questMenu';
import { QUESTS } from '../engine/engine';

export const globalVoteMenu = new Menu<MyContext>('global-vote')
    .text('Yes, i trust them completely 👍', async (ctx, next) => {
        await countGlobalVote(ctx, true);
        await next();
    })
    .row()
    .text("No, i don't think this is a good idea 👎", async (ctx, next) => {
        await countGlobalVote(ctx, false);
        await next();
    });

const countGlobalVote = async (ctx: MyContext, vote: boolean) => {
    const { allPlayers, nominatedPlayers } = ctx.session.game;
    if (ctx.session.game.votingArray.find((pl) => pl.player?.telegramId === ctx.from?.id)) {
        return;
    }
    ctx.session.game.votingArray.push({
        vote,
        player: allPlayers.find((pl) => pl.telegramId === ctx.from?.id) as Player,
    });
    await ctx.editMessageText(
        getPartyVoteText(nominatedPlayers, ctx.session.game.votingArray.length, allPlayers.length),
    );
    const voteResultList = checkForEveryoneAndRenderResults(allPlayers, ctx.session.game.votingArray);

    if (voteResultList) {
        await ctx.reply(voteResultList);
        // @ts-ignore
        await ctx.menu.close();

        const votePassed =
            ctx.session.game.votingArray.reduce((acc, vote) => {
                return vote.vote ? (acc += 1) : (acc -= 1);
            }, 0) > 0;

        ctx.session.game.votingArray = [];

        if (votePassed) {
            ctx.session.game.missedVotes = 0;
            ctx.session.game.currentQuest += 1;
            ctx.session.game.nominatedPlayers = [];
            ctx.session.game.partySize = QUESTS[allPlayers.length][ctx.session.game.currentQuest - 1];
            await ctx.reply(
                `✅ Vote successful! ✅\nNow The outcome of the quest depends on ${nominatedPlayers
                    .map(getPlayerRef)
                    .join(', ')}.`,
                {
                    reply_markup: questMenu,
                },
            );
        } else {
            ctx.session.game.missedVotes += 1;

            await ctx.reply(
                messageBuilder(
                    '‼️ Vote Failed ‼️',
                    'If you fail to go on a quest 5 times in a row then EVIL wins!',
                    `Missed votes in a row: ${ctx.session.game.missedVotes}`,
                ),
            );
            // TODO continue the same round
            if (ctx.session.game.missedVotes === 5) {
                await ctx.reply(getEndGameMessage(allPlayers, SIDES.EVIL), {
                    parse_mode: 'MarkdownV2',
                });
            } else {
                await ctx.reply(`Discus what happened and then the leader can /continue when ready`);
            }
        }
    }
};
