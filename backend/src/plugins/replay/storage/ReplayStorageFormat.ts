import { IsArray, IsBoolean, IsNumber, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export const REPLAY_FORMAT_VERSION = 1;

export class TeamSummary {
    @IsString()
    teamId: string;

    @IsBoolean()
    won: boolean;

    @IsNumber()
    roundsWon: number;

    @IsNumber()
    roundsPlayed: number;
}

export class PlayerSummary {
    @IsUUID('all')
    puuid: string;

    @IsString()
    gameName: string;

    @IsString()
    tagLine: string;

    @IsString()
    teamId: string;

    @IsString()
    characterId: string;

    @IsNumber()
    kills: number;

    @IsNumber()
    deaths: number;

    @IsNumber()
    assists: number;

    @IsBoolean()
    isObserver: boolean;
}

export class DownloadInfo {
    @IsNumber()
    downloadedAt: number;

    @IsUUID('all')
    downloaderId: string;
}

export class MatchInfo {
    @IsString()
    matchId: string;

    @IsString()
    mapId: string;

    @IsString()
    queueID: string;

    @IsString()
    gameVersion: string;

    @IsNumber()
    gameStartMillis: number;

    @IsNumber()
    gameLengthMillis: number;

    @IsBoolean()
    isRanked: boolean;
}

export class ReplayMetadata {
    @IsNumber()
    formatVersion: number;

    @IsNumber()
    replayFileSize: number;

    @ValidateNested()
    @Type(() => DownloadInfo)
    downloadInfo: DownloadInfo;

    @ValidateNested()
    @Type(() => MatchInfo)
    matchInfo: MatchInfo;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TeamSummary)
    teams: TeamSummary[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PlayerSummary)
    players: PlayerSummary[];
}
