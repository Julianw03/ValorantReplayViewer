import { IsString } from 'class-validator';
import { PlayerAliasDTO } from '#/dto/PlayerAliasDTO';


export class PlayerAlias implements PlayerAliasDTO {
    @IsString()
    readonly tagLine: string;
    @IsString()
    readonly gameName: string;
}
