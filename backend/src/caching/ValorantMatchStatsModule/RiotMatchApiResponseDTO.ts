export type SimpleUUID = string;
export type PUUID = SimpleUUID;

export interface MatchInfo {
    matchId: SimpleUUID;
    mapId: string;
    gamePodId: string;
    gameLoopZone: string;
    gameServerAddress: string;
    gameVersion: string;
    gameLengthMillis: number;
    gameStartMillis: number;
    provisioningFlowID: string;
    isCompleted: boolean;
    isEarlyCompletion: boolean;
    customGameName: string;
    forcePostProcessing: boolean;
    queueID: string;
    gameMode: string;
    isRanked: boolean;
    isMatchSampled: boolean;
    seasonId: SimpleUUID;
    completionState: string;
    platformType: string;
    premierMatchInfo: object;
    partyRRPenalties: Record<PUUID, number>;
    shouldMatchDisablePenalties: boolean;
    isReplayRecorded: boolean;
}

export interface Player {
    subject: PUUID;
    gameName: string;
    tagLine: string;
    platformInfo: PlatformInfo;
    teamId: string;
    partyId: SimpleUUID;
    characterId: SimpleUUID;
    stats: PlayerStats;
    roundDamage: RoundDamage[];
    competitiveTier: number;
    isObserver: boolean;
    playerCard: SimpleUUID;
    playerTitle: SimpleUUID;
    preferredLevelBorder: SimpleUUID;
    accountLevel: number;
    sessionPlaytimeMinutes: number;
    xpModifications: XPModification[];
    behaviorFactors: BehaviorFactors;
    newPlayerExperienceDetails: object;
    participationPeriods: object;
}

export interface PlatformInfo {
    platformType: string;
    platformOS: string;
    platformOSVersion: string;
    platformChipset: string;
    platformDevice: string;
}

export interface PlayerStats {
    score: number;
    roundsPlayed: number;
    kills: number;
    deaths: number;
    assists: number;
    playtimeMillis: number;
    abilityCasts: AbilityCasts;
}

export interface AbilityCasts {
    grenadeCasts: number;
    ability1Casts: number;
    ability2Casts: number;
    ultimateCasts: number;
}

export interface RoundDamage {
    round: number;
    receiver: PUUID;
    damage: number;
}

export interface XPModification {
    Value: number;
    ID: SimpleUUID;
    IncludeInV2: boolean;
    Type: number;
}

export interface BehaviorFactors {
    afkRounds: number;
    collisions: number;
    commsRatingRecovery: number;
    damageParticipationOutgoing: number;
    friendlyFireIncoming: number;
    friendlyFireOutgoing: number;
    mouseMovement: number;
    selfDamage: number;
    stayedInSpawnRounds: number;
}

export interface Team {
    teamId: string;
    won: boolean;
    roundsPlayed: number;
    roundsWon: number;
    numPoints: number;
}

export interface RoundResult {
    roundNum: number;
    roundResult: string;
    roundCeremony: string;
    winningTeam: string;
    winningTeamRole: string;
    bombPlanter: PUUID;
    plantRoundTime: number;
    plantPlayerLocations: PlayerEventLocation[] | null;
    plantLocation: Location;
    plantSite: string;
    defuseRoundTime: number;
    defusePlayerLocations: PlayerEventLocation[] | null;
    defuseLocation: Location;
    playerStats: RoundPlayerStat[];
    roundResultCode: string;
    playerEconomies: ({ subject: PUUID } & Economy)[];
    playerScores: {
        subject: PUUID;
        score: number;
    }[];
}

export interface PlayerEventLocation {
    subject: PUUID;
    viewRadians: number;
    location: Location;
}

export interface Location {
    x: number;
    y: number;
}

export interface RoundPlayerStat {
    subject: PUUID;
    kills: Kill[];
    damage: Damage[];
    score: number;
    economy: Economy;
    ability: Record<string, null>;
    wasAfk: boolean;
    wasPenalized: boolean;
    stayedInSpawn: boolean;
}

export interface Kill {
    gameTime: number;
    roundTime: number;
    killer: PUUID;
    victim: PUUID;
    victimLocation: Location;
    assistants: PUUID[];
    playerLocations: PlayerEventLocation[];
    finishingDamage: FinishingDamage;
}

export interface FinishingDamage {
    damageType: string;
    damageItem: SimpleUUID;
    isSecondaryFireMode: boolean;
}

export interface Damage {
    receiver: PUUID;
    damage: number;
    legshots: number;
    bodyshots: number;
    headshots: number;
}

export interface Economy {
    loadoutValue: number;
    weapon: SimpleUUID;
    armor: SimpleUUID;
    remaining: number;
    spent: number;
}

export interface RiotMatchApiResponse {
    matchInfo: MatchInfo;
    players: Partial<Player>[];
    bots: object[];
    coaches: object[];
    teams: Team[] | null;
    roundResults: Partial<RoundResult>[];
    kills: object[];
}

export class RiotMatchApiResponseDTO {}
