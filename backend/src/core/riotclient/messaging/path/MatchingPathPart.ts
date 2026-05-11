import { PATH_TYPE, PathPattern } from '@/core/riotclient/messaging/path/PathPattern';

export class MatchingPathPart extends PathPattern {
    public readonly type = PATH_TYPE.MATCHING as const;

    public constructor(
        public readonly captureName: string
    ) {
        super();
    }

    matches(pathSegment: string): boolean {
        return true;
    }
}