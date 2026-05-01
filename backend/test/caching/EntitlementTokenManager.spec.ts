import { EntitlementTokenManager } from '@/caching/EntitlementTokenModule/EntitlementTokenManager';
import { Test, TestingModule } from '@nestjs/testing';
import { RiotClientService } from '@/riotclient/RiotClientService';
import { RIOT_CLIENT_SERVICE } from '@/riotclient/RiotClientTokens';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { EntitlementsToken } from '../../gen';
import { RCUMessage, RCUMessageType } from '@/riotclient/messaging/RCUMessage';
import { EntitlementTokenRCUAdapter } from '@/caching/EntitlementTokenModule/EntitlementTokenRCUAdapter';
import { _DISCONNECT_HANDLER } from '@/riotclient/adapters/RCUDataAdapter';

describe('EntitlementTokenManager', () => {
    let service: EntitlementTokenManager;
    let rcService: jest.Mocked<RiotClientService>;
    let eventEmitter: EventEmitter2;
    let rcuAdapter: EntitlementTokenRCUAdapter;
    const mockEntitlementToken: EntitlementsToken = {
        accessToken: 'MockAccessToken',
        entitlements: new Array('MockEntitlement'),
        issuer: 'MockIssuer',
        subject: 'MockSubject',
        token: 'MockToken',
    };

    beforeEach(async () => {
        rcService = {
            getConfiguration: jest.fn(),
        } as unknown as jest.Mocked<RiotClientService>;

        const module: TestingModule = await Test.createTestingModule({
            imports: [EventEmitterModule.forRoot()],
            providers: [
                EntitlementTokenManager,
                EntitlementTokenRCUAdapter,
                {
                    provide: RIOT_CLIENT_SERVICE,
                    useValue: rcService,
                },
            ],
        }).compile();

        service = await module.resolve(EntitlementTokenManager);
        rcuAdapter = await module.resolve(EntitlementTokenRCUAdapter);
        eventEmitter = await module.resolve<EventEmitter2>(EventEmitter2);

        await module.init();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should update state when relevant message is received', async () => {
        const message = new RCUMessage(
            RCUMessageType.CREATE,
            '/entitlements/v1/token',
            mockEntitlementToken as JsonNode,
        );

        await rcuAdapter.onMessage(message);

        const view = service.getView()!;
        expect(view).not.toBeNull();
        expect(view.accessToken).toEqual(mockEntitlementToken.accessToken);
        expect(view.accessToken).toEqual(mockEntitlementToken.accessToken);
        expect(view.issuer).toEqual(mockEntitlementToken.issuer);
        expect(view.subject).toEqual(mockEntitlementToken.subject);
        expect(view.token).toEqual(mockEntitlementToken.token);
    });

    it('should ignore irrelevant messages', async () => {
        const message = new RCUMessage(
            RCUMessageType.CREATE,
            '/some/other/endpoint',
            mockEntitlementToken as JsonNode,
        );

        await rcuAdapter.onMessage(message);

        const view = service.getView();
        expect(view).toBeNull();
    });

    it('should reset state on disconnect', async () => {
        const message = new RCUMessage(
            RCUMessageType.CREATE,
            '/entitlements/v1/token',
            mockEntitlementToken as JsonNode,
        );

        await rcuAdapter.onMessage(message);
        expect(service.getView()).not.toBeNull();

        await rcuAdapter[_DISCONNECT_HANDLER]();
        expect(service.getView()).toBeNull();
    });
});
