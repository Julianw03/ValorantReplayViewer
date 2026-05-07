import { EntitlementTokenManager } from '@/caching/EntitlementTokenModule/EntitlementTokenManager';
import { EntitlementsToken } from '../../../gen';
import { beforeEach, describe, expect, it } from 'vitest';

describe('EntitlementTokenManager', () => {
    const mockEntitlementToken: EntitlementsToken = {
        accessToken: 'MockAccessToken',
        entitlements: new Array('MockEntitlement'),
        issuer: 'MockIssuer',
        subject: 'MockSubject',
        token: 'MockToken',
    };

    let manager: EntitlementTokenManager;

    beforeEach(() => {
        manager = new EntitlementTokenManager();
    });

    it('returns null view when no state has been set', () => {
        expect(manager.getView()).toBeNull();
    });

    it('maps EntitlementsToken to the expected view shape', () => {
        manager.updateValue(mockEntitlementToken);
        const view = manager.getView()!;
        expect(view.accessToken).toBe(mockEntitlementToken.accessToken);
        expect(view.issuer).toBe(mockEntitlementToken.issuer);
        expect(view.subject).toBe(mockEntitlementToken.subject);
        expect(view.token).toBe(mockEntitlementToken.token);
    });

    it('returns null view after state is cleared', () => {
        manager.updateValue(mockEntitlementToken);
        manager.deleteState();
        expect(manager.getView()).toBeNull();
    });
});
