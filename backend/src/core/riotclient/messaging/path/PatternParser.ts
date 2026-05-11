import { MatchingPathPart } from '@/core/riotclient/messaging/path/MatchingPathPart';
import { StaticPathPart } from '@/core/riotclient/messaging/path/StaticPathPart';

export type AnyPathPattern = MatchingPathPart | StaticPathPart;

const parseSinglePathSegment = (pathSegment: string): AnyPathPattern => {
    if (pathSegment.startsWith('{') && pathSegment.endsWith('}')) {
        return new MatchingPathPart(pathSegment.substring(1, pathSegment.length - 1));
    }

    return new StaticPathPart(pathSegment);
};

export const parsePatternString = (fullPath: string): AnyPathPattern[] => {
    return fullPath.split('/')
        .filter(pathSegment => pathSegment.length > 0)
        .map(pathSegment => parseSinglePathSegment(pathSegment));
};