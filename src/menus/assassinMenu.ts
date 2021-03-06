import { messageBuilder, getEndGameMessage } from './../utils/textUtils';
import { MyContext, ROLE_LIST, SIDES } from '../types';
import { Menu } from '@grammyjs/menu';
import { getPlayerRef } from '../utils/utils';

export const assassinMenu = new Menu<MyContext>('assassin-menu', { autoAnswer: false });

assassinMenu
    .dynamic((ctx, range) => {
        const assassin = ctx.session.game.allPlayers.find((pl) => pl.role?.key === ROLE_LIST.ASSASSIN);

        for (const player of ctx.session.game.allPlayers.filter((pl) => pl.role?.side !== SIDES.EVIL)) {
            range
                .text(
                    (ctx) => {
                        const selectMark = ctx.session.game.possibleMerlin?.id === player.id ? ' ✅' : '';
                        return `${getPlayerRef(player)} ${selectMark}`;
                    },
                    async (ctx, next) => {
                        if (ctx.from?.id === assassin?.telegramId) {
                            if (player.id === ctx.session.game.possibleMerlin?.id) {
                                ctx.session.game.possibleMerlin = null;
                            } else {
                                ctx.session.game.possibleMerlin = player;
                            }
                        }
                        ctx.menu.update();
                        await next();
                    },
                )
                .row();
        }
    })
    .text(
        (ctx) => `Confirm kill ${!ctx.session.game.possibleMerlin ? '🔒' : ''}`,
        async (ctx, next) => {
            const { possibleMerlin, allPlayers } = ctx.session.game;
            const assassin = allPlayers.find((pl) => pl.role?.key === ROLE_LIST.ASSASSIN);
            if (ctx.from.id !== assassin?.telegramId) {
                await ctx.answerCallbackQuery('Only assassin can confirm kill');
                return;
            }
            if (!possibleMerlin) {
                await ctx.answerCallbackQuery('Merlin is not selected');
                return;
            }
            const merlin = allPlayers.find((pl) => pl.role?.key === ROLE_LIST.MERLIN);
            if (possibleMerlin?.id === merlin?.id) {
                await ctx.reply(messageBuilder('🗡️ Merlin was slain!\n', getEndGameMessage(allPlayers, SIDES.EVIL)), {
                    parse_mode: 'HTML',
                });
            } else {
                await ctx.reply(
                    messageBuilder('🪄 Merlin outsmarted his enemies!\n', getEndGameMessage(allPlayers, SIDES.GOOD)),
                    { parse_mode: 'HTML' },
                );
            }
            await ctx.menu.close();
            await next();
        },
    );
