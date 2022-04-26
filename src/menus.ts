import { Player, Vote, MyContext, ROLE_LIST, DEFAULT_ROLES } from './types';

import { Menu, MenuRange } from '@grammyjs/menu';
import {
    getPlayerRef,
    getGlobalVoteText,
    checkForEveryoneAndRenderResults,
    checkIfDefaultRole,
    getListOfAllPlayersWithRoles,
} from './utils';

// TODO Split menus in a separate files
// TODO Replace recurring messages with build-text-functions

export const nominateMenu = new Menu<MyContext>('nominate-menu');
export const assassinMenu = new Menu<MyContext>('assassin-menu');

assassinMenu
    .dynamic((ctx, range) => {
        for (const player of ctx.session.game.allPlayers) {
            range
                .text(
                    (ctx) => getPlayerRef(player) + (ctx.session.game.possibleMerlin?.id === player.id ? ' ✅' : ''),
                    (ctx) => {
                        const assassin = ctx.session.game.allPlayers.find((pl) => pl.role?.key === ROLE_LIST.ASSASSIN);
                        if (ctx.from.id === assassin?.id) {
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

export const globalVoteMenu = new Menu<MyContext>('global-vote')
    .text('Yes, i trust them completely', (ctx) => countGlobalVote(ctx, true))
    .row()
    .text("No, i don't think this is a good idea", (ctx) => countGlobalVote(ctx, false));

export const questMenu = new Menu<MyContext>('quest-menu')
    .text('Success!', (ctx) => countQuestVote(ctx, true))
    .row()
    .text('Fail!', (ctx) => countQuestVote(ctx, false));

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

nominateMenu.dynamic((ctx, range) => {
    // TODO check that only current leader can nominate people. Also limit the amount of people who can be nominated
    for (const player of ctx.session.game.allPlayers) {
        range
            .text(
                (ctx) => {
                    const playerRef = getPlayerRef(player);
                    return ctx.session.game.nominatedPlayers.find((pl) => pl.telegramId === player.telegramId)
                        ? playerRef + ' ✅'
                        : playerRef;
                },
                (ctx) => {
                    const { nominatedPlayers, currentLeader, partySize } = ctx.session.game;
                    if (currentLeader?.telegramId !== ctx.from.id) {
                        ctx.reply(`Only current leader can nominate players. Be patient, ${ctx.from.first_name}`);
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
                    ctx.editMessageText(msgText);
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
            await ctx.reply('Vote Failed!');
        }
    }
};

const countQuestVote = async (ctx: MyContext, vote: boolean) => {
    const { nominatedPlayers, currentRound, allPlayers } = ctx.session.game;
    if (ctx.session.game.nominatedPlayers.some((el) => el.telegramId === ctx.from?.id)) {
        ctx.session.game.votingArray.push({ vote });
    }
    await ctx.editMessageText(
        `The outcome of the quest depends on ${nominatedPlayers.map(getPlayerRef).join(', ')}. \n${
            ctx.session.game.votingArray.length
        } out of ${nominatedPlayers.length} voted`,
    );

    if (nominatedPlayers.length === ctx.session.game.votingArray.length) {
        const voteFailed =
            currentRound === 4
                ? ctx.session.game.votingArray.filter((el) => !el).length < 2
                : ctx.session.game.votingArray.some((el) => !el.vote);
        voteFailed ? (ctx.session.game.evilScore += 1) : (ctx.session.game.goodScore += 1);
        await ctx.reply(`The quest has ${voteFailed ? 'Failed!' : 'Succeeded'}`);

        if (ctx.session.game.evilScore === 3) {
            await ctx.reply('Evil Wins!');
            await ctx.reply(`Here is a list of who were who: ${getListOfAllPlayersWithRoles(allPlayers)}`);
        } else if (ctx.session.game.goodScore === 3) {
            await ctx.reply(
                `Good Wins! But Evil still has a chance to snatch the victory!\nIf Assassin ${getPlayerRef(
                    allPlayers.find((pl) => pl.role?.key === ROLE_LIST.ASSASSIN),
                )} kills Merlin then Evil will triumph!\nPlease select who you think to be Merlin`,
                { reply_markup: assassinMenu },
            );
        } else {
            ctx.session.game.votingArray = [];
            await ctx.reply(`Discus what happened and /continue when ready`);
        }

        // @ts-ignore
        await ctx.menu.close();
    }
};
