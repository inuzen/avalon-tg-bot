import { Telegraf, Markup } from 'telegraf';
// require('dotenv').config();

const token = process.env.BOT_TOKEN;
if (token === undefined) {
    throw new Error('BOT_TOKEN must be provided!');
}

const bot = new Telegraf(token);

let currentPollId = 0;
interface Player {
    id: number;
    username?: string;
}
const players: Player[] = [];

// bot.on('poll', (ctx) => {
//     console.log(ctx.poll);
// });
// bot.on('poll_answer', (ctx) => console.log('Poll answer', ctx.pollAnswer));

bot.command('simple', (ctx) => {
    return ctx.replyWithHTML('<b>Coke</b> or <i>Pepsi?</i>', Markup.keyboard(['Coke', 'Pepsi']).oneTime());
});

bot.hears('Coke', (ctx) => ctx.reply('Yay!'));

bot.on('poll_answer', (ctx) => {
    if (ctx.pollAnswer.option_ids[0] === 0) {
        const { user } = ctx.pollAnswer;
        players.push({ id: user.id, username: user.username });
    }
});

bot.command('poll', async (ctx) => {
    if (currentPollId) {
        ctx.stopPoll(currentPollId);
        players.length = 0;
    }
    const msg = await ctx.replyWithPoll('Vote "join" if you want to play', ['join', 'pass'], { is_anonymous: false });
    currentPollId = msg.message_id;
});
bot.command('start', (ctx) => {
    if (currentPollId) {
        ctx.stopPoll(currentPollId).then((res) => console.log(res));

        ctx.reply(players.toString());
        currentPollId = 0;
    }
});

bot.command('msg', async (ctx) => {
    try {
        await ctx.telegram.sendMessage(players[0].id, 'bruh');
    } catch (error) {
        console.log(error);
        ctx.telegram.sendMessage(ctx.chat.id, 'please start the bot');
    }
});
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
