import SemVer from 'semver/classes/semver';
import semverGt from 'semver/functions/gt';
import semverEq from 'semver/functions/eq';

const versionExtractRegex = /^([a-zA-Z]+)-(?<major>\d+)\.(?<minor>\d+)-([a-zA-Z]+)-(?<patch>\d+)-(?<build>\d+)$/;

const parseVersion = (version: string) => {
    try {
        const match = versionExtractRegex.exec(version);
        if (!match || !match.groups) {
            throw new Error(`Version string does not match expected format: ${version}`);
        }
        const { major, minor, patch, build } = match.groups;
        return {
            major: parseInt(major, 10),
            minor: parseInt(minor, 10),
            patch: parseInt(patch, 10),
            build: parseInt(build, 10),
        };
    } catch (e) {
        return undefined;
    }
};

export const parseSemver = (version: string): SemVer | undefined => {
    try {
        const parsed = parseVersion(version);
        return new SemVer(`${parsed?.major}.${parsed?.minor}.${parsed?.patch}-${parsed?.build}`);
    } catch (e) {
        return undefined;
    }
};

export const checkCompatibility = (
    currentVersion: string,
    versionToCheck: string,
): VersionComparisonResult => {
    try {
        const current = parseSemver(currentVersion);
        const candidate = parseSemver(versionToCheck);

        if (!current || !candidate) {
            return VersionComparisonResult.UNKNOWN;
        }

        if (semverEq(current, candidate)) {
            return VersionComparisonResult.EXACT_MATCH;
        }

        const sameMajorMinor =
            current.major === candidate.major &&
            current.minor === candidate.minor;

        if (
            sameMajorMinor &&
            semverGt(current, candidate)
        ) {
            return VersionComparisonResult.PROBABLY_COMPATIBLE;
        }

        return VersionComparisonResult.INCOMPATIBLE;
    } catch {
        return VersionComparisonResult.UNKNOWN;
    }
};

export const VersionComparisonResult = {
    UNKNOWN: 'UNKNOWN',
    EXACT_MATCH: 'EXACT_MATCH',
    PROBABLY_COMPATIBLE: 'PROBABLY_COMPATIBLE',
    INCOMPATIBLE: 'INCOMPATIBLE',
} as const;

export type VersionComparisonResult = typeof VersionComparisonResult[keyof typeof VersionComparisonResult];