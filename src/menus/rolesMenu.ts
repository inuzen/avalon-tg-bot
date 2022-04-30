import { messageBuilder } from './../utils/textUtils';
import { MyContext, ROLE_LIST, DEFAULT_ROLES } from '../types';
import { Menu, MenuRange } from '@grammyjs/menu';
import { checkIfDefaultRole } from '../utils/utils';

export const roleMenu = new Menu<MyContext>('roles-menu', { autoAnswer: false })
    .dynamic(() => {
        const range = new MenuRange<MyContext>();
        const roleListArray = Object.values(ROLE_LIST).filter((role) => !DEFAULT_ROLES.includes(role));
        DEFAULT_ROLES.forEach((role) => {
            range.text(role + ' 🔒').row();
        });
        roleListArray.forEach((role) => {
            range
                .text(
                    (ctx) => `${role}  ${ctx.session.extraRoles.includes(role) ? '✅' : ''}`,
                    async (ctx, next) => {
                        if (ctx.from.id !== ctx.session.roleMenuCallerId) {
                            await ctx.answerCallbackQuery("You can't change these settings");
                            return;
                        }
                        if (!checkIfDefaultRole(role)) {
                            if (ctx.session.extraRoles.includes(role)) {
                                ctx.session.extraRoles = ctx.session.extraRoles.filter((rl) => rl !== role);
                            } else {
                                ctx.session.extraRoles.push(role);
                            }
                            ctx.menu.update();
                        }
                        await ctx.answerCallbackQuery();
                        await next();
                    },
                )
                .row();
        });

        return range;
    })
    .text('Save', async (ctx) => {
        if (ctx.from.id !== ctx.session.roleMenuCallerId) {
            await ctx.answerCallbackQuery("You can't change these settings");
            return;
        }
        ctx.menu.close();
        const { extraRoles } = ctx.session;
        await ctx.reply(
            messageBuilder(
                'Roles are saved.',
                'Next game will have:',
                extraRoles.length ? `${extraRoles.join(', ')}` : 'Only default roles',
            ),
        );
    });
