import { MyContext, ROLE_LIST, DEFAULT_ROLES } from '../types';
import { Menu, MenuRange } from '@grammyjs/menu';
import { checkIfDefaultRole } from '../utils';

export const roleMenu = new Menu<MyContext>('roles-menu')
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
                    (ctx) => {
                        if (!checkIfDefaultRole(role)) {
                            if (ctx.session.extraRoles.includes(role)) {
                                ctx.session.extraRoles = ctx.session.extraRoles.filter((rl) => rl !== role);
                            } else {
                                ctx.session.extraRoles.push(role);
                            }
                            ctx.menu.update();
                        }
                    },
                )
                .row();
        });

        return range;
    })
    .text('Save', async (ctx) => {
        ctx.menu.close();
        await ctx.reply(`Roles are saved. Next game will have: ${ctx.session.extraRoles.join(', ')}`);
    });
