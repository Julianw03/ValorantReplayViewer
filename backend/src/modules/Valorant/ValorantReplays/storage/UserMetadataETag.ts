export function toETag(version: number): string {
    return `"${version}"`;
}

export function parseIfMatch(header: string | undefined): number[] | null {
    if (header === undefined || header.trim().length === 0) {
        return null;
    }
    return header
        .split(',')
        .map((entry) => /^"(\d+)"$/.exec(entry.trim()))
        .filter((match): match is RegExpExecArray => match !== null)
        .map((match) => Number(match[1]));
}
