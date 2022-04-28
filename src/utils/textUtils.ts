import { Player, SIDES, Vote } from '../types';
import { getPlayerRef } from './utils';

export const messageBuilder = (...lines: string[]) => lines.join('\n');

export const buildStartGameMessage = (joinedPlayers: Player[], hostId: number) => {
    const commonLines = [
        'Press Join if you want to play.',
        `The [host](tg://user?id=${hostId}) - can add extra /roles.`,
        'To begin the host should press Start',
    ];
    if (joinedPlayers.length === 0) {
        commonLines.push('No one has joined yet');
    } else {
        commonLines.push(`Currently joined: ${joinedPlayers.map(getPlayerRef).join('\n')}`);
    }
    return messageBuilder(...commonLines);
};

export const getGlobalVoteText = (have: number, need: number) => {
    return messageBuilder(
        `Leader must select ${need} players for this Quest`,
        `Currently selected ${have} out of ${need}`,
    );
};

export const getPartyVoteText = (nominatedPlayers: Player[], voted: number, total: number) => {
    return messageBuilder(
        'Now everyone should vote 🗳️!',
        `Selected players are ${nominatedPlayers.map(getPlayerRef).join(', ')}.`,
        `${voted} out of ${total} voted`,
    );
};

export const renderVoteResults = (votingArray: Vote[]) => {
    return messageBuilder(...votingArray.map((vote) => `${getPlayerRef(vote.player)} - ${vote.vote ? '✅' : '❌'}`));
};

export const getEndGameMessage = (players: Player[], winSide: SIDES) => {
    return messageBuilder(
        `🏆 Forces of *${winSide}* won! 🏆`,
        'Here is a list of who were who:',
        ...players.map((player) => `*${player.role?.roleName}* - ${getPlayerRef(player)}`),
    );
};
