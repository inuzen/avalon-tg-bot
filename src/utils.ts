import { Player, Vote, MyContext, ROLE_LIST, DEFAULT_ROLES } from './types';

export const getPlayerRef = (player?: Player) => {
    return player ? `${player.name}(@${player.username})` : '';
};
export const getPlayersRefStringById = (players: Player[], id: number | number[], withId = false) => {
    return players.reduce((acc: string[], player) => {
        if ((Array.isArray(id) && id.includes(player.telegramId)) || player.telegramId === id) {
            acc.push(getPlayerRef(player));
        }
        return acc;
    }, []);
};
export const getListOfAllPlayersWithRoles = (players: Player[]) => {
    return players
        .reduce((acc: string[], player) => {
            acc.push(`*${player.role?.roleName}* - ${getPlayerRef(player)}`);
            return acc;
        }, [])
        .join('\n');
};
export const renderVoteResults = (votingArray: Vote[]) => {
    return votingArray.reduce((acc, curr) => {
        const voteText = `${getPlayerRef(curr.player)} has voted ${
            curr.vote ? 'in favor of' : 'against'
        } this party \n`;
        return (acc += voteText);
    }, '');
};

export const checkForEveryoneAndRenderResults = (allPlayers: Player[], votingArray: Vote[]) =>
    allPlayers.length === votingArray.length ? renderVoteResults(votingArray) : null;

export const getGlobalVoteText = (need: number, have: number): string => {
    return `Please nominate players by selecting them in a menu bellow. \nFor current quest you need ${need} \nSelect ${
        need - have
    } more player(s)`;
};

export const checkIfDefaultRole = (role: ROLE_LIST) => DEFAULT_ROLES.includes(role);

export const messageBuilder = (lines: string[]) => lines.join('\n');
