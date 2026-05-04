/**
 * Does not guarantee that the promise that is passed will be cancelled.
 * Rather promises returned by this function will reject with a timeout error if the original promise does not resolve within the specified time.
 *
 * */
export const withMaxTimeout = <T>(
    promise: Promise<T>,
    timeoutMs: number
): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new TimeoutError("Max Timeout reached")), timeoutMs)
        ),
    ]);
};

export class TimeoutError extends Error {
    constructor(message?: string) {
        super(message);
    }
}