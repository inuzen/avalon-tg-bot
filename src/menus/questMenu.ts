import { MyContext, ROLE_LIST } from '../types';
import { Menu } from '@grammyjs/menu';
import { getPlayerRef, getListOfAllPlayersWithRoles } from '../utils';
import { assassinMenu } from './assassinMenu';

export const questMenu = new Menu<MyContext>('quest-menu')
    .text('Success!', (ctx) => countQuestVote(ctx, true))
    .row()
    .text('Fail!', (ctx) => countQuestVote(ctx, false));

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
            await ctx.reply(`Discus what happened and then the leader can /continue when ready`);
        }

        // @ts-ignore
        await ctx.menu.close();
    }
};
