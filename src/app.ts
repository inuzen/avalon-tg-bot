import { Bot, session, InlineKeyboard } from 'grammy';
import { run } from '@grammyjs/runner';
import { apiThrottler } from '@grammyjs/transformer-throttler';

import { createMessageByRole, generateRoles, QUESTS } from './engine/engine';

// menus
import { globalVoteMenu } from './menus/globalVoteMenu';
import { nominateMenu } from './menus/nominateMenu';
import { questMenu } from './menus/questMenu';
import { roleMenu } from './menus/rolesMenu';
import { assassinMenu } from './menus/assassinMenu';

// utils
import { getPlayerRef, mapUserToPlayer } from './utils/utils';
import { getGlobalVoteText, messageBuilder, buildStartGameMessage, renderQuestHistory } from './utils/textUtils';
import cloneDeep from 'clone-deep';

//types
import { Game, ROLE_LIST, SIDES, MyContext, SessionData } from './types';

require('dotenv').config();

// TODO Add filters for group and private chat messages
// TODO Allow only the host to change settings, continue rounds and stop games

const token = process.env.BOT_TOKEN;
if (token === undefined) {
    throw new Error('BOT_TOKEN must be provided!');
}

const bot = new Bot<MyContext>(token);

const throttler = apiThrottler();
bot.api.config.use(throttler);

const initialGameState: Game = {
    hostId: 0,
    allPlayers: [],
    partySize: 0,
    evilScore: 0,
    goodScore: 0,
    currentQuest: 0,
    currentLeader: null,
    nominatedPlayers: [],
    extraRoles: [],
    missedVotes: 0,
    votingArray: [],
    possibleMerlin: null,
    questHistory: { 1: null, 2: null, 3: null, 4: null, 5: null },
};

bot.use(
    session({
        initial: (): SessionData => ({
            game: cloneDeep(initialGameState),
            extraRoles: [],
            roleMenuCallerId: undefined,
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

    if (ctx.from?.id) {
        ctx.session.game.hostId = ctx.from?.id;

        await ctx.reply(buildStartGameMessage(ctx.session.game.allPlayers, ctx.from?.id!), {
            reply_markup: inlineKeyboard,
            parse_mode: 'HTML',
        });
    } else {
        await ctx.reply("Couldn't start the game due to invalid host id");
    }

    await next();
});

bot.callbackQuery('join-game', async (ctx, next) => {
    if (ctx.session.game.allPlayers.length === 10) {
        await ctx.reply('Player limit exceeded (max 10)');
        return;
    }
    if (ctx.from?.id && !ctx.session.game.allPlayers.some((pl) => pl.telegramId === ctx.from.id)) {
        ctx.session.game.allPlayers.push(mapUserToPlayer(ctx.from));

        await ctx.editMessageText(buildStartGameMessage(ctx.session.game.allPlayers, ctx.session.game.hostId!), {
            reply_markup: inlineKeyboard,
            parse_mode: 'HTML',
        });
    } else {
        await ctx.answerCallbackQuery("You've already joined!");
    }

    await next();
});

bot.callbackQuery('start-game', async (ctx, next) => {
    if (ctx.session.game.hostId !== ctx.from.id) {
        await ctx.answerCallbackQuery('Only host can start the game');
        return;
    }

    const currentPlayers = ctx.session.game.allPlayers.length;
    if (currentPlayers < 5) {
        await ctx.answerCallbackQuery('Need more players to start');
        return;
    }

    ctx.session.game.currentQuest = 1;
    ctx.session.game.partySize = QUESTS[ctx.session.game.allPlayers.length][ctx.session.game.currentQuest - 1];

    const assignedRoles = generateRoles(ctx.session.game.allPlayers, ctx.session.extraRoles);
    ctx.session.game.allPlayers = assignedRoles.allPlayers;
    const leader = ctx.session.game.allPlayers.find((pl) => pl.id === 1);
    ctx.session.game.currentLeader = leader || null;

    assignedRoles.allPlayers.forEach(async (player) => {
        // TODO Maybe and emojis for each role and side
        const messages = [
            `Your role is <b>${player.role.roleName}</b>`,
            `You play on the side of <b>${player.role.side}</b> ${player.role.side === SIDES.EVIL ? '😈' : '😇'}`,
        ];

        if (player.role.side === SIDES.EVIL) {
            if (player.role.key !== ROLE_LIST.OBERON) {
                const otherEvilPlayers = assignedRoles.evil.reduce((acc: string[], evilPlayer) => {
                    if (evilPlayer.role.key !== ROLE_LIST.OBERON && player.telegramId !== evilPlayer.telegramId) {
                        acc.push(getPlayerRef(evilPlayer));
                    }
                    return acc;
                }, []);
                if (otherEvilPlayers.length) {
                    messages.push(`Other Evil players are: ${otherEvilPlayers.join(', ')}`);
                }
            }
        }

        const initialMessage = createMessageByRole(player.role.key, assignedRoles);
        messages.push(initialMessage);
        await bot.api.sendMessage(player.telegramId, messageBuilder(...messages), { parse_mode: 'HTML' });
    });
    // TODO automatically open nominations
    await ctx.editMessageText('The game has started!');
    await ctx.reply(`👑 The leader is ${getPlayerRef(leader!)}\nUse /nominate to open menu`);

    await next();
});

bot.filter((ctx) => ctx.from?.id === ctx.session.game.currentLeader?.telegramId).command(
    'continue',
    async (ctx, next) => {
        const { allPlayers, currentLeader } = ctx.session.game;
        const currLeaderId = currentLeader?.id || 0;
        const newLeaderId = currLeaderId === allPlayers.length ? 1 : currLeaderId + 1;
        const newLeader = allPlayers.find((pl) => pl.id === newLeaderId);
        ctx.session.game.currentLeader = newLeader!;

        await ctx.reply(
            messageBuilder(
                '⏳ New round has started!',
                '',
                `👑 New leader is ${getPlayerRef(newLeader)}`,
                `📍 Quest number: ${ctx.session.game.currentQuest}`,
                `Required party size is ${ctx.session.game.partySize}`,
                '',
                `Current score is Good ${ctx.session.game.goodScore} - ${ctx.session.game.evilScore} Evil`,
                '',
                'Leader should /nominate a new party',
            ),
        );
        await next();
    },
);

bot.filter((ctx) => ctx.from?.id === ctx.session.game.currentLeader?.telegramId).command(
    'nominate',
    async (ctx, next) => {
        const { partySize, nominatedPlayers } = ctx.session.game;
        await ctx.reply(getGlobalVoteText(nominatedPlayers.length, partySize, ctx.session.game.currentQuest), {
            reply_markup: nominateMenu,
        });

        await next();
    },
);

bot.command('roles', async (ctx, next) => {
    ctx.session.roleMenuCallerId = ctx.from?.id;
    await ctx.reply(
        messageBuilder(
            'Select extra roles to be used in a game.',
            'It persists between sessions but will be set to default if bot was offline',
        ),
        { reply_markup: roleMenu },
    );
    await next();
});

bot.command('rules', async (ctx, next) => {
    await ctx.reply('Rules can be found here https://www.ultraboardgames.com/avalon/game-rules.php');

    await next();
});

bot.command('help', async (ctx, next) => {
    await ctx.reply(
        messageBuilder(
            'Use /new to start the game',
            '',
            `Use /roles to select additional roles for the game`,
            '',
            "<b>IMPORTANT!</b> If the bot doesn't respond to your action - just wait. DO NOT spam click buttons as it may break the bot",
            '',
            'The game consists of several rounds. Only current LEADER can press continue buttons on a menu(except for assassin menu).',
            'After game starts it will display messages on how to proceed. So read the messages ',
            '',
            "If something doesn't work or some bug is discovered, please contact @inuzen",
        ),
    );

    await next();
});

bot.catch((err) => console.error(err));
run(bot);
