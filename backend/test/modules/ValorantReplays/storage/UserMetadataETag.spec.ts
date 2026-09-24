import { describe, expect, it } from 'vitest';
import { parseIfMatch, toETag } from '@/modules/Valorant/ValorantReplays/storage/UserMetadataETag';

describe('UserMetadataETag', () => {
    it('round-trips a version through the ETag header', () => {
        expect(parseIfMatch(toETag(7))).toEqual([7]);
    });

    it('treats an absent or blank header as missing', () => {
        expect(parseIfMatch(undefined)).toBeNull();
        expect(parseIfMatch('  ')).toBeNull();
    });

    it('accepts lists and ignores weak, wildcard and malformed entries', () => {
        expect(parseIfMatch('"3", W/"4", *, "abc", 5, "6"')).toEqual([3, 6]);
    });
});
