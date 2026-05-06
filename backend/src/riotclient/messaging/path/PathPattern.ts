export enum PATH_TYPE {
    STATIC = 'STATIC',
    MATCHING = 'MATCHING',
}

export abstract class PathPattern {
    public abstract readonly type: PATH_TYPE;

    protected constructor() {
    }

    public abstract matches(pathSegment: string): boolean;
}