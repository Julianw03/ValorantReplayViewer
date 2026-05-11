import { IsBoolean, IsNumber } from 'class-validator';

export class StorageStatusDTO {
    @IsBoolean()
    readonly isSetup: boolean;
    @IsNumber()
    readonly matchCount: number;
    @IsNumber()
    readonly totalSizeBytes: number;
}
