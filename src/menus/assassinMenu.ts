import { MyContext, ROLE_LIST, SIDES } from '../types';
import { Menu, MenuRange } from '@grammyjs/menu';
import { getPlayerRef } from '../utils';

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
            await ctx.reply('The Merlin was guessed correctly! The Evil side wins!');
        } else {
            await ctx.reply('The Merlin outsmarted his enemies! The Good side wins!');
        }
        await ctx.menu.close();
    });
