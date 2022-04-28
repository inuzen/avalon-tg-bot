import { MyContext } from '../types';
import { Menu } from '@grammyjs/menu';
import { getPlayerRef } from '../utils/utils';
import { getGlobalVoteText, getPartyVoteText } from '../utils/textUtils';
import { globalVoteMenu } from './globalVoteMenu';

export const nominateMenu = new Menu<MyContext>('nominate-menu');

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
                    const { nominatedPlayers, currentLeader, partySize } = ctx.session.game;
                    if (currentLeader?.telegramId !== ctx.from.id) {
                        await ctx.reply(`Only current leader can nominate players. Be patient, ${ctx.from.first_name}`);
                        return;
                    }

                    if (nominatedPlayers.some((pl) => pl.telegramId === player.telegramId)) {
                        ctx.session.game.nominatedPlayers = nominatedPlayers.filter(
                            (el) => el.telegramId !== player.telegramId,
                        );
                        const msgText = getGlobalVoteText(ctx.session.game.nominatedPlayers.length, partySize);
                        await ctx.editMessageText(msgText);
                    } else if (nominatedPlayers.length === partySize) {
                        await ctx.reply(`The party is full. You need to deselect someone if you want to replace them`);
                        return;
                    } else {
                        ctx.session.game.nominatedPlayers.push(player);
                        const msgText = getGlobalVoteText(ctx.session.game.nominatedPlayers.length, partySize);
                        await ctx.editMessageText(msgText);
                    }
                    await next();
                },
            )
            .row();
    }
});

nominateMenu.text('Confirm Party', async (ctx, next) => {
    const { nominatedPlayers, partySize, allPlayers } = ctx.session.game;
    if (nominatedPlayers.length === partySize) {
        await ctx.menu.close();
        ctx.session.game.votingArray = [];
        await ctx.reply(getPartyVoteText(nominatedPlayers, 0, allPlayers.length), {
            reply_markup: globalVoteMenu,
        });
    }
    await next();
});
