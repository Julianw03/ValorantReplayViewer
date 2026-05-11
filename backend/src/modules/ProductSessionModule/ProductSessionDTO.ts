import { IsArray, IsBoolean, IsObject, IsString } from 'class-validator';
import { ProductSession, ProductSessionLaunchConfig } from '#/dto/ProductSession';

export class ProductSessionDTO implements ProductSession {
    @IsString()
    readonly productId: string;
    @IsBoolean()
    readonly isInternal: boolean;
    @IsObject()
    readonly launchConfiguration: ProductSessionLaunchConfigDTO;
}

export class ProductSessionLaunchConfigDTO implements ProductSessionLaunchConfig {
    @IsArray()
    readonly arguments: Array<string>;
    @IsString()
    readonly executable: string;
    @IsString()
    readonly locale: string;
    @IsString()
    readonly workingDirectory: string;
}
