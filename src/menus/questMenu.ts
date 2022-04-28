import { MyContext, ROLE_LIST, SIDES } from '../types';
import { Menu } from '@grammyjs/menu';
import { getPlayerRef } from '../utils/utils';
import { getEndGameMessage } from '../utils/textUtils';
import { assassinMenu } from './assassinMenu';
import { messageBuilder } from '../utils/textUtils';

export const questMenu = new Menu<MyContext>('quest-menu')
    .text('Success!', (ctx) => countQuestVote(ctx, true))
    .row()
    .text('Fail!', (ctx) => countQuestVote(ctx, false));

const countQuestVote = async (ctx: MyContext, vote: boolean) => {
    const { nominatedPlayers, currentQuest, allPlayers } = ctx.session.game;
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
            currentQuest === 4
                ? ctx.session.game.votingArray.filter((el) => !el).length < 2
                : ctx.session.game.votingArray.some((el) => !el.vote);
        voteFailed ? (ctx.session.game.evilScore += 1) : (ctx.session.game.goodScore += 1);
        await ctx.reply(`The quest has ${voteFailed ? 'Failed!' : 'Succeeded'}`);
        if (ctx.session.game.evilScore === 3) {
            await ctx.reply(getEndGameMessage(allPlayers, SIDES.EVIL), {
                parse_mode: 'MarkdownV2',
            });
        } else if (ctx.session.game.goodScore === 3) {
            await ctx.reply(
                messageBuilder(
                    'Good wins... but not just yet!',
                    'Evil has last chance to snatch the victory!',
                    `If 🥷 Assassin ${getPlayerRef(
                        allPlayers.find((pl) => pl.role?.key === ROLE_LIST.ASSASSIN),
                    )} kills 🧙‍♂️ Merlin then Evil will triumph!`,
                    '⬇️ Please select who you think is Merlin ⬇️',
                ),
                { reply_markup: assassinMenu },
            );
        } else {
            ctx.session.game.votingArray = [];
            await ctx.reply(`Discus what happened and then the leader can /continue when ready`);
        }

        // @ts-ignore
        await ctx.menu.close();
    }
};
