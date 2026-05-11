import * as RiotClientService from './RiotClientService';
import {
    ConflictException,
    Controller,
    Get,
    Header,
    HttpCode,
    HttpStatus,
    Inject,
    Post,
} from '@nestjs/common';
import { RIOT_CLIENT_SERVICE } from './RiotClientTokens';
import { ApiResponse } from '@nestjs/swagger';

@Controller({
    version: '1',
    path: 'riotclient',
})
export class RiotClientController {
    constructor(
        @Inject(RIOT_CLIENT_SERVICE)
        private readonly riotClientService: RiotClientService.RiotClientService,
    ) {}

    @Post('connect')
    @ApiResponse({
        status: HttpStatus.NO_CONTENT,
        description: 'Attempts to connect to the Riot Client.',
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    async connect() {
        if (this.riotClientService.isConnected()) {
            throw new ConflictException(
                'Riot Client is already connected or in the process of connecting.',
            );
        }
        await this.riotClientService.connect();
    }

    @Post('disconnect')
    @HttpCode(HttpStatus.NO_CONTENT)
    async disconnect() {
        if (!this.riotClientService.isConnected()) {
            throw new ConflictException('Riot Client is not connected.');
        }
        await this.riotClientService.disconnect();
    }

    @Get('status/connected')
    @Header('Content-Type', 'application/json')
    @ApiResponse({
        type: Boolean,
        description:
            'Returns true if connected to the Riot Client, false otherwise.',
    })
    @HttpCode(HttpStatus.OK)
    isConnected(): boolean {
        return this.riotClientService.isConnected();
    }
}
