import { MyContext } from '../types';
import { Menu } from '@grammyjs/menu';
import { getPlayerRef } from '../utils/utils';
import { getGlobalVoteText, getPartyVoteText } from '../utils/textUtils';
import { globalVoteMenu } from './globalVoteMenu';

export const nominateMenu = new Menu<MyContext>('nominate-menu', { autoAnswer: false });

nominateMenu.dynamic((ctx, range) => {
    for (const player of ctx.session.game.allPlayers) {
        range
            .text(
                (ctx) => {
                    const playerRef = getPlayerRef(player);
                    return ctx.session.game.nominatedPlayers.find((pl) => pl.telegramId === player.telegramId)
                        ? playerRef + ' ✅'
                        : playerRef;
                },
                async (ctx, next) => {
                    const { nominatedPlayers, currentLeader, partySize, currentQuest } = ctx.session.game;
                    if (currentLeader?.telegramId !== ctx.from.id) {
                        await ctx.answerCallbackQuery(`Only current leader can nominate players`);
                        return;
                    }

                    if (nominatedPlayers.some((pl) => pl.telegramId === player.telegramId)) {
                        ctx.session.game.nominatedPlayers = nominatedPlayers.filter(
                            (el) => el.telegramId !== player.telegramId,
                        );
                        const msgText = getGlobalVoteText(
                            ctx.session.game.nominatedPlayers.length,
                            partySize,
                            currentQuest,
                        );
                        await ctx.editMessageText(msgText);
                    } else if (nominatedPlayers.length === partySize) {
                        await ctx.answerCallbackQuery(`The party is full`);
                        return;
                    } else {
                        ctx.session.game.nominatedPlayers.push(player);
                        const msgText = getGlobalVoteText(
                            ctx.session.game.nominatedPlayers.length,
                            partySize,
                            currentQuest,
                        );
                        await ctx.editMessageText(msgText);
                    }

                    await next();
                },
            )
            .row();
    }
});

nominateMenu.text(
    (ctx) => {
        const { nominatedPlayers, partySize } = ctx.session.game;
        const locked = nominatedPlayers.length !== partySize;
        return `Confirm Party ${locked ? '🔒' : ''}`;
    },
    async (ctx, next) => {
        const { nominatedPlayers, partySize, allPlayers, currentLeader } = ctx.session.game;
        if (ctx.from.id !== currentLeader?.telegramId) {
            ctx.answerCallbackQuery('Only leader can confirm the party');
            return;
        }

        if (nominatedPlayers.length === partySize) {
            await ctx.menu.close();
            ctx.session.game.votingArray = [];
            await ctx.reply(getPartyVoteText(nominatedPlayers, 0, allPlayers.length), {
                reply_markup: globalVoteMenu,
            });
        } else {
            await ctx.answerCallbackQuery('Need to select more players');
        }
        await next();
    },
);
