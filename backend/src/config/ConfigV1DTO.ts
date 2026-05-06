import {
    IsArray,
    IsDecimal, IsDefined,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { SemVer } from 'semver';
import path from 'path';
import { IsCompleteRegionToPvpUrlMap } from '@/utils/IsCompleteRegionToPvpUrlMap';
import { IsSemver } from '@/utils/IsSemver';

export enum SupportedRegion {
    NA = 'na',
    LATAM = 'latam',
    EU = 'eu',
    AP = 'ap',
    KR = 'kr',
    BR = 'br',
}

export enum SupportedShard {
    NA = 'na',
    PBE = 'pbe',
    EU = 'eu',
    AP = 'ap',
    KR = 'kr'
}

export const RegionToDefaultShardMap: Record<SupportedRegion, SupportedShard> = {
    [SupportedRegion.NA]: SupportedShard.NA,
    [SupportedRegion.LATAM]: SupportedShard.NA,
    [SupportedRegion.BR]: SupportedShard.NA,
    [SupportedRegion.EU]: SupportedShard.EU,
    [SupportedRegion.AP]: SupportedShard.AP,
    [SupportedRegion.KR]: SupportedShard.KR,
} as const;

export class VersionConfig {
    @IsNumber()
    config: number;

    @IsSemver()
    @IsString()
    app: string;

    public getSemver(): SemVer {
        return new SemVer(this.app);
    }
}

export class FilepathEntry {
    @IsOptional()
    @IsString()
    relativeToEnvVar?: string;

    @IsArray()
    @IsString({ each: true })
    path: string[];

    public getResolvedPath(): string {
        if (this.relativeToEnvVar) {
            const envValue = process.env[this.relativeToEnvVar];
            if (!envValue) {
                throw new Error(`Environment variable ${this.relativeToEnvVar} is not set`);
            }
            return path.join(envValue, ...this.path);
        }
        return path.join(...this.path);
    }
}

export class FilepathConfig {
    @ValidateNested()
    @Type(() => FilepathEntry)
    'riot-games-folder': FilepathEntry;

    @ValidateNested()
    @Type(() => FilepathEntry)
    'valorant-saved': FilepathEntry;
}

export class VersionReadConfiguration {
    @IsInt()
    @IsPositive()
    'retry-timeout-ms': number = 5_000;

    @IsString()
    'regex': string;
}

export class AppConfigurationConfig {
    @IsInt()
    @IsPositive()
    port: number = 3_000;

    @IsArray()
    @IsString({ each: true })
    'additional-cors-origins': string[] = [];
}

export class Configurations {
    @ValidateNested()
    @Type(() => AppConfigurationConfig)
    app: AppConfigurationConfig;

    @ValidateNested()
    @Type(() => VersionReadConfiguration)
    'valorant-version-read': VersionReadConfiguration;
}

export class ValorantVersionReadOverrides {
    @IsOptional()
    @IsString()
    version: string;
}

export class ValorantApiOverrides {
    @IsOptional()
    @IsEnum(SupportedRegion)
    region?: SupportedRegion;

    @IsOptional()
    @IsEnum(SupportedShard)
    shard?: SupportedShard;
}

export class OverrideConfig {
    @ValidateNested()
    @Type(() => ValorantApiOverrides)
    'valorant-api': ValorantApiOverrides;

    @ValidateNested()
    @Type(() => ValorantVersionReadOverrides)
    'valorant-version-read': ValorantVersionReadOverrides;
}

export class EnvConfigV1DTO {
    @ValidateNested()
    @Type(() => VersionConfig)
    version: VersionConfig;

    @ValidateNested()
    @Type(() => FilepathConfig)
    filepaths: FilepathConfig;

    @ValidateNested()
    @Type(() => Configurations)
    configurations: Configurations;

    @ValidateNested()
    @Type(() => OverrideConfig)
    overrides: OverrideConfig;
}