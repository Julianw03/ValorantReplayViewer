import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetRecentMatchesDto {
    @ApiProperty({
        description: 'Offset (starting index)',
        example: 0,
        minimum: 0,
    })
    @Type(() => Number)
    @IsInt()
    @Min(0)
    offset: number;

    @ApiProperty({
        description: 'Number of results to return',
        example: 10,
        minimum: 1,
        maximum: 20,
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(20)
    limit: number;
}
