import { messageBuilder, getEndGameMessage } from './../utils/textUtils';
import { MyContext, ROLE_LIST, SIDES } from '../types';
import { Menu } from '@grammyjs/menu';
import { getPlayerRef } from '../utils/utils';

export const assassinMenu = new Menu<MyContext>('assassin-menu');

assassinMenu
    .dynamic((ctx, range) => {
        const assassin = ctx.session.game.allPlayers.find((pl) => pl.role?.key === ROLE_LIST.ASSASSIN);
        for (const player of ctx.session.game.allPlayers.filter((pl) => pl.role?.side !== SIDES.EVIL)) {
            range
                .text(
                    (ctx) => getPlayerRef(player) + (ctx.session.game.possibleMerlin?.id === player.id ? ' ✅' : ''),
                    (ctx) => {
                        if (ctx.from.id === assassin?.telegramId) {
                            let { possibleMerlin } = ctx.session.game;
                            if (possibleMerlin?.id === player.id) {
                                possibleMerlin = null;
                            } else {
                                possibleMerlin = player;
                            }
                        }
                    },
                )
                .row();
        }
    })
    .text('Confirm', async (ctx) => {
        const { possibleMerlin, allPlayers } = ctx.session.game;
        const merlin = allPlayers.find((pl) => pl.role?.key === ROLE_LIST.MERLIN);
        if (possibleMerlin?.id === merlin?.id) {
            await ctx.reply(messageBuilder('🗡️ Merlin was slain! 🗡️\n', getEndGameMessage(allPlayers, SIDES.EVIL)));
        } else {
            await ctx.reply(
                messageBuilder('🪄 Merlin outsmarted his enemies! 🪄\n', getEndGameMessage(allPlayers, SIDES.GOOD)),
            );
        }
        await ctx.menu.close();
    });
