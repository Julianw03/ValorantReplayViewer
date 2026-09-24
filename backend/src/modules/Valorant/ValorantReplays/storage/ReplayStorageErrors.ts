export class MatchNotFoundError extends Error {
    constructor(matchId: string) {
        super(`Match ${matchId} not found in storage`);
    }
}

export class MatchAlreadyExistsError extends Error {
    constructor(matchId: string) {
        super(`Match ${matchId} already exists in storage`);
    }
}

export class ReplayFileMissingError extends Error {
    constructor(matchId: string) {
        super(`Match ${matchId} has no replay file in storage`);
    }
}

export class IllegalDownloadStateError extends Error {
}

export class InvalidReplayArchiveError extends Error {
}

export class InvalidMatchIdError extends Error {
    constructor(matchId: string) {
        super(`Invalid match id ${matchId}`);
    }
}

export class UserMetadataVersionMismatchError extends Error {
    constructor(matchId: string, public readonly currentVersion: number) {
        super(`User metadata of match ${matchId} was modified concurrently (current version ${currentVersion})`);
    }
}
