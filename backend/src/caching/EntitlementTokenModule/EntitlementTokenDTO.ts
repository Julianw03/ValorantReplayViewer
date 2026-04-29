import { IsArray, IsString } from 'class-validator';

export class EntitlementTokenDTO {
    @IsString()
    readonly accessToken: string;
    @IsArray()
    readonly entitlements: Array<string>;
    @IsString()
    readonly issuer: string;
    @IsString()
    readonly subject: string;
    @IsString()
    readonly token: string;
}
