import { MyContext } from '../types';
import { Menu } from '@grammyjs/menu';
import { getPlayerRef } from '../utils/utils';
import { getGlobalVoteText } from '../utils/textUtils';
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
                async (ctx) => {
                    const { nominatedPlayers, currentLeader, partySize } = ctx.session.game;
                    if (currentLeader?.telegramId !== ctx.from.id) {
                        await ctx.reply(`Only current leader can nominate players. Be patient, ${ctx.from.first_name}`);
                        return;
                    }
                    if (nominatedPlayers.some((pl) => pl.telegramId === player.telegramId)) {
                        ctx.session.game.nominatedPlayers = nominatedPlayers.filter(
                            (el) => el.telegramId !== player.telegramId,
                        );
                    } else {
                        nominatedPlayers.push(player);
                    }

                    const msgText = getGlobalVoteText(partySize, nominatedPlayers.length);
                    await ctx.editMessageText(msgText);
                },
            )
            .row();
    }
});

nominateMenu.text('Confirm Party', async (ctx) => {
    await ctx.menu.close();
    await ctx.reply(
        `Now everyone should vote for these people. Selected players are ${ctx.session.game.nominatedPlayers
            .map(getPlayerRef)
            .join(', ')}`,
        {
            reply_markup: globalVoteMenu,
        },
    );
});
