import { getPlayerRef } from './../utils';
import { ROLES, Player, Role, SIDES, ROLE_LIST } from '../types';

// in a format of "player_count": [good, evil]
const ROLE_DISTRIBUTION: Record<number, number[]> = {
    2: [1, 1], // TODO delete after test
    5: [3, 2],
    6: [4, 2],
    7: [4, 3],
    8: [5, 3],
    9: [6, 3],
    10: [6, 4],
};

export const QUESTS: Record<number, number[]> = {
    2: [1, 1, 1, 1, 1],
    5: [2, 3, 2, 3, 3],
};

const shuffle = <T>(a: T[], b?: any, c?: any, d?: any): T[] => {
    //array,placeholder,placeholder,placeholder
    c = a.length;
    while (c) (b = (Math.random() * c--) | 0), (d = a[c]), (a[c] = a[b]), (a[b] = d);
    return a;
};

const createRoleDistributionArray = (num: number, extraRolesList: ROLE_LIST[] = []) => {
    const defaultRoles = [ROLES.MERLIN, ROLES.ASSASSIN];
    const extraRoles = extraRolesList.map((el) => ROLES[el]);
    const roles = defaultRoles.concat(extraRoles);

    const [good, evil] = ROLE_DISTRIBUTION[num];

    const extraGoodRoles = roles.filter((role) => role.side === SIDES.GOOD);
    const extraEvilRoles = roles.filter((role) => role.side === SIDES.EVIL);

    const goodRoles: Role[] = Array(good).fill(ROLES.SERVANT);
    const evilRoles: Role[] = Array(evil).fill(ROLES.MINION);

    goodRoles.splice(0, extraGoodRoles.length, ...extraGoodRoles);
    evilRoles.splice(0, extraEvilRoles.length, ...extraEvilRoles);

    return goodRoles.concat(evilRoles);
};

export const generateRoles = (playerArray: Player[], extraRolesList: ROLE_LIST[]) => {
    const playerCount = playerArray.length;

    const shuffledPlayers = shuffle(playerArray);
    const roles = createRoleDistributionArray(playerCount, extraRolesList);

    if (shuffledPlayers.length !== roles.length) {
        console.error('more players then roles');
        throw new Error();
    }
    // Maybe there is a better way but oh well
    const playersWithRoles = shuffledPlayers.map((player, i) => ({ ...player, role: roles[i] }));
    // the second shuffle is to prevent sending to players list of roles in the same order. e.g. For good side Merlin player would be the first in the list always
    const shuffledPlayersWithRoles = shuffle(playersWithRoles).map((el, i) => ({ ...el, id: i + 1 }));
    return {
        allPlayers: shuffledPlayersWithRoles,
        good: shuffledPlayersWithRoles.filter((el) => el.role.side === SIDES.GOOD),
        evil: shuffledPlayersWithRoles.filter((el) => el.role.side === SIDES.EVIL),
    };
};

type GeneratedRoles = ReturnType<typeof generateRoles>;

export const createMessageByRole = (role: ROLE_LIST, assignedRoles: GeneratedRoles): string => {
    switch (role) {
        case ROLE_LIST.MERLIN:
            return `Evil players are: ${assignedRoles.evil
                .reduce((acc: string[], evilPlayer) => {
                    if (evilPlayer.role?.key !== ROLE_LIST.MORDRED && evilPlayer.role?.key !== ROLE_LIST.OBERON) {
                        acc.push(`${evilPlayer.name}(@${evilPlayer.username})`);
                    }
                    return acc;
                }, [])
                .join(', ')}`;
        case ROLE_LIST.PERCIVAL:
            const merlin = assignedRoles.good.find((pl) => pl.role.key === ROLE_LIST.MERLIN)!;
            const morgana = assignedRoles.evil.find((player) => player.role.key === ROLE_LIST.MORGANA)!;
            const concealed = shuffle([merlin, morgana]);

            return morgana
                ? `Merlin is either ${concealed.map(getPlayerRef).join(' or ')}`
                : `Merlin is ${getPlayerRef(merlin)}`;

        default:
            return '';
    }
};

export const getCurrentQuestPartySize = () => {};
