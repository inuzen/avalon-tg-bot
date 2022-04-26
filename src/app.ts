import { Bot, session, InlineKeyboard } from 'grammy';
import { createMessageByRole, generateRoles, QUESTS } from './engine/engine';
import { globalVoteMenu, nominateMenu, questMenu, roleMenu, assassinMenu } from './menus';
// utils
import { getGlobalVoteText, getPlayerRef } from './utils';
import cloneDeep from 'clone-deep';
//types
import { Game, ROLE_LIST, SIDES, MyContext, SessionData, DEFAULT_ROLES } from './types';

require('dotenv').config();

// TODO Everywhere where session is set - use next()
// TODO Allow only the host to change settings and stop games

const token = process.env.BOT_TOKEN;
if (token === undefined) {
    throw new Error('BOT_TOKEN must be provided!');
}

const bot = new Bot<MyContext>(token);

const initialGameState: Game = {
    hostId: 0,
    allPlayers: [],
    partySize: 0,
    evilScore: 0,
    goodScore: 0,
    currentRound: 0,
    currentLeader: null,
    nominatedPlayers: [],
    extraRoles: [],
    missedVotes: 0,
    votingArray: [],
    possibleMerlin: null,
};

bot.use(
    session({
        initial: (): SessionData => ({
            game: cloneDeep(initialGameState),
            extraRoles: [],
        }),
    }),
);

// TODO do bot initial stuff like this in a separate file
bot.use(assassinMenu);
bot.use(roleMenu);
bot.use(questMenu);
bot.use(globalVoteMenu);
bot.use(nominateMenu);

bot.api.setMyCommands([
    { command: 'new', description: 'Start new game' },
    { command: 'roles', description: 'Set what roles you want to include' },
    { command: 'help', description: 'Displays help text and bot how-to-play flow' },
    { command: 'rules', description: 'Sends a link to rules' },
]);

const inlineKeyboard = new InlineKeyboard().text('Join', 'join-game').row().text('Start Game', 'start-game');

bot.command('new', async (ctx, next) => {
    ctx.session.game = cloneDeep(initialGameState);
    ctx.reply(
        `Press Join if you want to play. \nWhen everyone is ready press Start.\nUse /roles to add extra roles to the game`,
        {
            reply_markup: inlineKeyboard,
        },
    );

    await next();
});

bot.callbackQuery('join-game', async (ctx, next) => {
    if (ctx.from?.id && !ctx.session.game.allPlayers.some((pl) => pl.telegramId === ctx.from.id)) {
        ctx.session.game.allPlayers.push({
            telegramId: ctx.from.id,
            id: 0,
            role: null,
            username: ctx.from.username || '',
            name: ctx.from.first_name || '',
        });
        await ctx.editMessageText(
            `Press Join if you want to play. \nWhen everyone is ready press Start.\nCurrently joined: \n${ctx.session.game.allPlayers
                .map(getPlayerRef)
                .join('\n')}`,
            { reply_markup: inlineKeyboard },
        );
    }

    await next();
});

bot.callbackQuery('start-game', async (ctx, next) => {
    // TODO check that game can be started
    ctx.session.game.currentRound = 1;
    ctx.session.game.partySize = QUESTS[ctx.session.game.allPlayers.length][ctx.session.game.currentRound - 1];

    const assignedRoles = generateRoles(ctx.session.game.allPlayers, ctx.session.extraRoles);
    ctx.session.game.allPlayers = assignedRoles.allPlayers;
    const leader = ctx.session.game.allPlayers.find((pl) => pl.id === 1);
    ctx.session.game.currentLeader = leader || null;

    assignedRoles.allPlayers.forEach(async (player) => {
        await bot.api.sendMessage(player.telegramId, `You play on the side of ${player.role.side}`);
        await bot.api.sendMessage(player.telegramId, `Your role is ${player.role.roleName}`);

        if (player.role.side === SIDES.EVIL) {
            if (player.role.key !== ROLE_LIST.OBERON) {
                await bot.api.sendMessage(
                    player.telegramId,
                    `Other Evil players are: ${assignedRoles.evil
                        .reduce((acc: string[], evilPlayer) => {
                            if (
                                evilPlayer.role.key !== ROLE_LIST.OBERON &&
                                player.telegramId !== evilPlayer.telegramId
                            ) {
                                acc.push(`${player.name}(@${player.username})`);
                            }
                            return acc;
                        }, [])
                        .join(', ')}`,
                );
            }
        }

        const initialMessage = createMessageByRole(player.role.key, assignedRoles);
        initialMessage && (await bot.api.sendMessage(player.telegramId, initialMessage));
    });
    // TODO automatically open nominations
    await ctx.editMessageText('The game has started!');
    await ctx.reply(`The leader is ${getPlayerRef(leader!)}. Use /nominate to open menu`);

    await next();
});

bot.command('continue', async (ctx, next) => {
    // TODO check for how the quest vote finished to account for failed quest
    let { allPlayers, currentLeader } = ctx.session.game;
    ctx.session.game.currentRound += 1;
    ctx.session.game.nominatedPlayers = [];
    ctx.session.game.partySize = QUESTS[allPlayers.length][ctx.session.game.currentRound - 1];
    const currLeaderId = currentLeader?.id || 0;
    const newLeaderId = currLeaderId === allPlayers.length ? 1 : currLeaderId + 1;
    const newLeader = allPlayers.find((pl) => pl.id === newLeaderId);
    ctx.session.game.currentLeader = newLeader!;
    await ctx.reply(
        `New round has started! New leader is ${getPlayerRef(newLeader)}\nRound number: ${
            ctx.session.game.currentRound
        }\nRequired party size is ${ctx.session.game.partySize}\nCurrent score is Good ${
            ctx.session.game.goodScore
        } - ${ctx.session.game.evilScore} Evil \nUse /nominate to choose them`,
    );
    await next();
});

bot.filter((ctx) => ctx.from?.id === ctx.session.game.currentLeader?.telegramId).command(
    'nominate',
    async (ctx, next) => {
        const { partySize, nominatedPlayers } = ctx.session.game;
        await ctx.reply(getGlobalVoteText(partySize, nominatedPlayers.length), {
            reply_markup: nominateMenu,
        });

        await next();
    },
);

// TODO add /desc command to get description of the role in private chat

bot.command('roles', async (ctx, next) => {
    ctx.reply(
        'Select extra roles to be used in a game.\nIt persists between session but will be emptied if bot was offline',
        { reply_markup: roleMenu },
    );
    await next();
});

bot.catch((err) => console.error(err));
bot.start();
