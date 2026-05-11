import { IsEnum } from 'class-validator';
import { MatchStatus } from '@/modules/Valorant/ValorantGameSessionModule/MatchStatus';

export class MatchStatusDTO {
    @IsEnum(MatchStatus)
    readonly status: MatchStatus;
}
