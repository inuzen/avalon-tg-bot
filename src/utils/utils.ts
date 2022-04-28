import { User } from 'grammy/out/platform.node';
import { Player, Vote, ROLE_LIST, DEFAULT_ROLES } from '../types';
import { renderVoteResults } from './textUtils';

export const getPlayerRef = (player?: Player) => {
    return player ? `${player.name}(@${player.username})` : '';
};
export const getPlayersRefStringById = (players: Player[], id: number | number[]) => {
    return players.reduce((acc: string[], player) => {
        if ((Array.isArray(id) && id.includes(player.telegramId)) || player.telegramId === id) {
            acc.push(getPlayerRef(player));
        }
        return acc;
    }, []);
};

export const checkForEveryoneAndRenderResults = (allPlayers: Player[], votingArray: Vote[]) =>
    allPlayers.length === votingArray.length ? renderVoteResults(votingArray) : null;

export const checkIfDefaultRole = (role: ROLE_LIST) => DEFAULT_ROLES.includes(role);

export const mapUserToPlayer = (from: User) => {
    return {
        telegramId: from.id,
        id: 0,
        role: null,
        username: from.username || '',
        name: from.first_name || '',
    };
};
