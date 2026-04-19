import { TwoTeamDetailsPanel } from '@/components/match-details/twoTeams/TwoTeamDetailsPanel.tsx';
import { FFAMatchDetailsPanel } from '@/components/match-details/ffa/FFAMatchDetailsPanel.tsx';

export interface MinimalMatchTeam {
    teamId: string;
    won: boolean;
    roundsPlayed: number;
    roundsWon: number;
}

export interface MinimalMatchPlayer {
    subject: string,
    gameName: string
    tagLine: string
    teamId: string
    characterId: string
    isObserver: boolean
    stats: MinimalPlayerStats
}

export interface MinimalPlayerStats {
    kills: number;
    deaths: number;
    assists: number;
}

export interface MinimalMatchInfo {
    matchId: string;
    mapId: string;
    queueID: string;
    gameVersion: string;
    gameLengthMillis: number;
    gameStartMillis: number;
    isRanked: boolean;
}

export interface MatchDetailsPanelProps {
    teams: MinimalMatchTeam[];
    players: MinimalMatchPlayer[];
    matchInfo: MinimalMatchInfo;
    highlightPlayer?: string;
}

export const KNOWN_QUEUE_IDS = {
    COMPETITIVE: 'competitive',
    SPIKE_RUSH: 'spikerush',
    UNRATED: 'unrated',
    SWIFTPLAY: 'swiftplay',
    DEATHMATCH: 'deathmatch',
    PREMIER: 'premier',
} as const;

export const MatchDetailsPanel = (
    props: MatchDetailsPanelProps,
) => {
    const queueId = props.matchInfo.queueID;
    switch (queueId) {
        case KNOWN_QUEUE_IDS.COMPETITIVE:
        case KNOWN_QUEUE_IDS.SPIKE_RUSH:
        case KNOWN_QUEUE_IDS.SWIFTPLAY:
        case KNOWN_QUEUE_IDS.UNRATED:
        case KNOWN_QUEUE_IDS.PREMIER:
            return (
                <TwoTeamDetailsPanel {...props} />
            );
        case KNOWN_QUEUE_IDS.DEATHMATCH:
            return (<FFAMatchDetailsPanel {...props} />);
        default:
            return (<div>Unknown queue type: {queueId}</div>);
    }
};