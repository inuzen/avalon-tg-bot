import { Player, MyContext } from '../types';
import { Menu } from '@grammyjs/menu';
import { getPlayerRef, checkForEveryoneAndRenderResults } from '../utils';
import { questMenu } from './questMenu';
import { syncBuiltinESMExports } from 'module';

export const globalVoteMenu = new Menu<MyContext>('global-vote')
    .text('Yes, i trust them completely', (ctx) => countGlobalVote(ctx, true))
    .row()
    .text("No, i don't think this is a good idea", (ctx) => countGlobalVote(ctx, false));

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
        `Now everyone should vote. Selected players are ${nominatedPlayers.map(getPlayerRef).join(', ')}. \n${
            ctx.session.game.votingArray.length
        } out of ${allPlayers.length} voted`,
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
            await ctx.reply(
                `Vote successful! \nNow The outcome of the quest depends on ${nominatedPlayers
                    .map(getPlayerRef)
                    .join(', ')}.`,
                {
                    reply_markup: questMenu,
                },
            );
        } else {
            ctx.session.game.missedVotes += 1;
            await ctx.reply(
                `Vote Failed!\nIf you fail to go on a quest 5 times in a row then EVIL wins!\nMissed votes in a row: ${ctx.session.game.missedVotes}`,
            );
            if (ctx.session.game.missedVotes === 5) {
                await ctx.reply(
                    "The game is over and Evil has won! You couldn't decide who you trust 5 times in a row",
                );
            }
        }
    }
};
