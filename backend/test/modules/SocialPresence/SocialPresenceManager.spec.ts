import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SimpleEventBus } from '@/core/events/SimpleEventBus';
import { SocialPresenceManager } from '@/modules/SocialPresence/SocialPresenceManager';
import { SocialPresenceSessionV1 } from '../../../gen';

function presence(product: string, region: string, productData?: unknown): SocialPresenceSessionV1 {
    return { product, region, detailedState: 'away', productData } as SocialPresenceSessionV1;
}

describe('SocialPresenceManager', () => {
    let manager: SocialPresenceManager;

    let publish: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        publish = vi.fn();
        const bus = { publish } as unknown as SimpleEventBus;
        manager = new SocialPresenceManager(bus);
    });

    it('exposes the mapped presence view keyed by product', () => {
        manager.updateValue({
            valorant: presence('valorant', 'eu'),
            lion: presence('lion', 'na'),
        });

        expect(manager.getView()).toEqual({
            valorant: { product: 'valorant', region: 'eu' },
            lion: { product: 'lion', region: 'na' },
        });
        expect(manager.getKeyView('valorant')).toEqual({ product: 'valorant', region: 'eu' });
        expect(manager.getKeyView('league_of_legends')).toBeNull();
    });

    it('replaces the whole state on updateValue, dropping absent products', () => {
        manager.updateValue({
            valorant: presence('valorant', 'eu'),
            lion: presence('lion', 'na'),
        });

        manager.updateValue({ valorant: presence('valorant', 'ap') });

        expect(manager.getView()).toEqual({ valorant: { product: 'valorant', region: 'ap' } });
        expect(manager.getKeyView('lion')).toBeNull();
    });

    it('keeps the previously good presence when a session fails validation, applying the valid keys in the same batch', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        manager.updateValue({
            valorant: presence('valorant', 'eu'),
            lion: presence('lion', 'na'),
        });

        manager.updateValue({
            valorant: { product: 'valorant', region: 123 } as unknown as SocialPresenceSessionV1,
            lion: presence('lion', 'ap'),
        });

        expect(manager.getKeyView('valorant')).toEqual({ product: 'valorant', region: 'eu' });
        expect(manager.getKeyView('lion')).toEqual({ product: 'lion', region: 'ap' });

        const lastPayload = publish.mock.calls.at(-1)?.[0]?.payload?.value;
        expect(lastPayload).toMatchObject({ valorant: { product: 'valorant', region: 'eu' } });
    });

    it('clears the state on deleteState', () => {
        manager.updateValue({ valorant: presence('valorant', 'eu') });

        manager.deleteState();

        expect(manager.getView()).toBeNull();
    });

    it('strips unknown fields from valorant productData down to the known shape', () => {
        manager.updateValue({
            valorant: presence('valorant', 'eu', {
                partyOwnerMatchScoreAllyTeam: 7,
                partyOwnerMatchScoreEnemyTeam: 4,
                someFutureRiotField: 'unrecognized',
            }),
        });

        expect(manager.getKeyView('valorant')).toEqual({
            product: 'valorant',
            region: 'eu',
            productData: { partyOwnerMatchScoreAllyTeam: 7, partyOwnerMatchScoreEnemyTeam: 4 },
        });
    });

    it('leaves productData untouched for products other than valorant', () => {
        manager.updateValue({
            lion: presence('lion', 'na', { anything: 'goes', nested: { too: true } }),
        });

        expect(manager.getKeyView('lion')).toEqual({
            product: 'lion',
            region: 'na',
            productData: { anything: 'goes', nested: { too: true } },
        });
    });

    it('rejects a valorant presence whose productData has the wrong shape, keeping the previous good value', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        manager.updateValue({
            valorant: presence('valorant', 'eu', { partyOwnerMatchScoreAllyTeam: 7 }),
        });

        manager.updateValue({
            valorant: presence('valorant', 'na', { partyOwnerMatchScoreAllyTeam: 'not-a-number' }),
        });

        expect(manager.getKeyView('valorant')).toEqual({
            product: 'valorant',
            region: 'eu',
            productData: { partyOwnerMatchScoreAllyTeam: 7 },
        });
    });
});
