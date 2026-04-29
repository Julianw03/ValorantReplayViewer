export const AsyncResultType = {
    PENDING: 'PENDING',
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE',
} as const;

export type AsyncResultType = typeof AsyncResultType[keyof typeof AsyncResultType];

export type AsyncResultUnion<T, E extends Error> =
    | Pending<T, E>
    | Success<T, E>
    | Failure<T, E>;

// TODO: Make lazy eval possible
export abstract class AsyncResult<T, E extends Error> {
    abstract readonly type: AsyncResultType;

    static pending<T, E extends Error = Error>() {
        return new Pending<T, E>();
    }

    static success<T, E extends Error = Error>(data: T) {
        return new Success<T, E>(data);
    }

    static failure<T, E extends Error = Error>(error: E) {
        return new Failure<T, E>(error);
    }

    static async fromPromise<T, E extends Error = Error>(
        promise: Promise<T>,
    ): Promise<AsyncResult<T, E>> {
        try {
            const value = await promise;
            return AsyncResult.success<T, E>(value);
        } catch (err) {
            return AsyncResult.failure<T, E>(err as E);
        }
    }

    toPromise(): Promise<AsyncResult<T, E>> {
        return Promise.resolve(this);
    }

    isSuccess(): this is Success<T, E> {
        return this.type === AsyncResultType.SUCCESS;
    }

    isFailure(): this is Failure<T, E> {
        return this.type === AsyncResultType.FAILURE;
    }

    isPending(): this is Pending<T, E> {
        return this.type === AsyncResultType.PENDING;
    }

    map<F>(mapper: (from: T) => F): AsyncResult<F, E> {
        if (this.isSuccess()) {
            return AsyncResult.success(mapper(this.data));
        }
        return this as unknown as AsyncResult<F, E>;
    }

    async flatMapAsync<F>(
        mapper: (value: T) => Promise<AsyncResult<F, E>>,
    ): Promise<AsyncResult<F, E>> {
        if (this.isSuccess()) {
            return mapper(this.data);
        }
        return this as unknown as AsyncResult<F, E>;
    }

    mapOrElse<F>(mapper: (from: T) => F, defaultValue: F): AsyncResult<F, E> {
        if (this.isSuccess()) {
            return AsyncResult.success(mapper(this.data));
        }
        return AsyncResult.success(defaultValue);
    }

    mapError<F extends Error>(mapper: (from: E) => F): AsyncResult<T, F> {
        if (this.isFailure()) {
            return AsyncResult.failure(mapper(this.error));
        }
        return this as unknown as AsyncResult<T, F>;
    }
}

export class Pending<T, E extends Error> extends AsyncResult<T, E> {
    readonly type = AsyncResultType.PENDING;
}

export class Success<T, E extends Error> extends AsyncResult<T, E> {
    readonly type = AsyncResultType.SUCCESS;
    readonly data: T;

    constructor(data: T) {
        super();
        this.data = data;
    }
}

export class Failure<T, E extends Error> extends AsyncResult<T, E> {
    readonly type = AsyncResultType.FAILURE;
    readonly error: E;

    constructor(error: E) {
        super();
        this.error = error;
    }
}