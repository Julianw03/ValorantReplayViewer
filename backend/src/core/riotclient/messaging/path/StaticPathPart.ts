import { PATH_TYPE, PathPattern } from '@/core/riotclient/messaging/path/PathPattern';

export class StaticPathPart extends PathPattern {
    public readonly type = PATH_TYPE.STATIC as const;

    public constructor(
        public readonly pathToMatch: string,
    ) {
        super();
    }

    matches(pathSegment: string): boolean {
        return this.pathToMatch === pathSegment;
    }
}