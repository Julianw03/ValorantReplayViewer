import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { SocialPresenceManager } from '@/modules/SocialPresence/SocialPresenceManager';

@Controller({
    path: 'caching/valorant/multigame-presences',
    version: '1',
})
export class SocialPresenceController {
    constructor(
        private readonly socialPresenceManager: SocialPresenceManager,
    ) {
    }

    @Get('')
    public async getMultigamePresences() {
        return this.socialPresenceManager.getView();
    }

    @Get(':productId')
    public async getMultigamePresenceByProductId(
        @Param('productId') productId: string,
    ) {
        const presence = this.socialPresenceManager.getKeyView(productId);
        if (!presence) {
            throw new NotFoundException();
        }
        return presence;
    }
}
