export class MappingError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'MappingError';
    }
}

export const MAPPING_FAILED = Symbol('MAPPING_FAILED');
export type MappingFailed = typeof MAPPING_FAILED;

export function safeMap<From, To>(
    mappingFn: (from: From) => To,
    from: From,
    context: string,
): To | MappingFailed {
    try {
        return mappingFn(from);
    } catch (e) {
        if (e instanceof MappingError) {
            console.warn(`[${context}] mapping rejected: ${e.message}`, e.cause);
            return MAPPING_FAILED;
        }
        throw e;
    }
}
