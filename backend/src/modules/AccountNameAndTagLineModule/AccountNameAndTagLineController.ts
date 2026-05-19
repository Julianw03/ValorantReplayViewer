import {
    Controller,
    Get,
    HttpStatus,
    Logger,
    NotFoundException,
    UseGuards,
} from '@nestjs/common';
import { AccountNameAndTagLineManager } from '@/modules/AccountNameAndTagLineModule/AccountNameAndTagLineManager';
import { ApiNotFoundResponse, ApiResponse } from '@nestjs/swagger';
import { PlayerAlias } from '@/modules/AccountNameAndTagLineModule/PlayerAlias';
import { RiotClientReadyGuard } from '@/core/riotclient/RiotClientReadyGuard';

@UseGuards(RiotClientReadyGuard)
@Controller({
    path: 'caching/account-name-and-tag-line',
    version: '1',
})
export class AccountNameAndTagLineController {
    private readonly logger = new Logger(this.constructor.name);

    constructor(
        protected readonly accountNameAndTagLineManager: AccountNameAndTagLineManager,
    ) {}

    @Get('active')
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Returns the active account name and tag line.',
        type: PlayerAlias,
    })
    @ApiNotFoundResponse({
        description:
            'Returned when the active account name and tag line are not found, possibly because the user is not logged in.',
        type: NotFoundException,
    })
    public async getActiveAccountNameAndTagLine() {
        const optState = this.accountNameAndTagLineManager.getView();
        if (optState === null) {
            throw new NotFoundException(
                'Active account name and tag line not found, maybe you are not logged in?',
            );
        }
        return optState;
    }
}
