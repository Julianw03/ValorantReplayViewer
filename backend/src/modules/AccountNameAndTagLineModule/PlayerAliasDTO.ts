import { IsString } from 'class-validator';
import { PlayerAlias } from '#/dto/PlayerAlias';

export class PlayerAliasDTO implements PlayerAlias{
    @IsString()
    readonly tagLine: string;
    @IsString()
    readonly gameName: string;
}
