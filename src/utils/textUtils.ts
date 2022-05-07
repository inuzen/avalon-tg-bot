import { Game, Player, SIDES, Vote } from '../types';
import { getPlayerRef } from './utils';

export const messageBuilder = (...lines: string[]) => lines.join('\n');

export const buildStartGameMessage = (joinedPlayers: Player[], hostId: number) => {
    const commonLines = [
        'Press Join if you want to play.',
        `The <a href="tg://user?id=${hostId}">host</a> can add extra /roles.`,
        'To begin the host should press Start',
    ];
    if (joinedPlayers.length === 0) {
        commonLines.push('No one has joined yet');
    } else {
        commonLines.push(`Currently joined:`, ...joinedPlayers.map(getPlayerRef));
    }
    return messageBuilder(...commonLines);
};

export const getGlobalVoteText = (have: number, need: number, questN?: number) => {
    return messageBuilder(
        `Leader must select ${need} players for this Quest`,
        `Currently selected ${have} out of ${need}`,
        '',
        questN === 4 ? '* 2 ❌ required for this quest to fail' : '',
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
        `🏆 Forces of <b>${winSide}</b> won! 🏆`,
        '',
        'Here is a list of who were who:',
        ...players.map((player) => `<b>${player.role?.roleName}</b> - ${getPlayerRef(player)}`),
    );
};

export const getVoteSuccessMsg = (nominatedPlayers: Player[], voted: number) => {
    return messageBuilder(
        '✅ Vote successful! ✅',
        '',
        "Now it's all in the hands of:",
        ...nominatedPlayers.map(getPlayerRef),
        '',
        `${voted} out of ${nominatedPlayers.length} voted`,
    );
};

export const renderQuestHistory = (questHistory: Record<number, boolean | null>) => {
    const messageLines = ['Quest progress:', '<code>| 1 | 2 | 3 | 4 | 5 |'];
    let history = '|';
    for (const value of Object.values(questHistory)) {
        if (typeof value === 'boolean') {
            // history += `${value ? '✅' : '❌'}|`;
            history += `${value ? ' W ' : ' L '}|`;
        } else {
            history += ` N |`;
        }
    }
    return messageBuilder(...messageLines, history, '</code>');
};
