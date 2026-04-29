import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { InternalServerErrorException } from '@nestjs/common';

export enum AsyncResultType {
    PENDING = 'PENDING',
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE',
}

type ErrorConstructor<E extends Error> = new (...args: any[]) => E;

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

    static async mapErrorAsync<T, E extends Error>(
        asyncResultPromise: Promise<AsyncResult<T, E>>,
        errorMap: Map<ErrorConstructor<any>, (e: any) => Error>,
    ): Promise<T> {
        let res: AsyncResult<T, E>;

        try {
            res = await asyncResultPromise;
        } catch (err) {
            throw new InternalServerErrorException(err);
        }

        if (res.isSuccess()) {
            return res.data;
        }

        if (res.isFailure()) {
            for (const [ErrorCtor, mapper] of errorMap.entries()) {
                if (res.error instanceof ErrorCtor) {
                    throw mapper(res.error);
                }
            }
        }

        throw new InternalServerErrorException('Unexpected pending state');
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
    @ApiProperty({
        enum: AsyncResultType,
        enumName: 'AsyncResultType',
        default: AsyncResultType.PENDING,
    })
    readonly type = AsyncResultType.PENDING;
}

export class Success<T, E extends Error> extends AsyncResult<T, E> {
    @ApiProperty({
        enum: AsyncResultType,
        enumName: 'AsyncResultType',
        default: AsyncResultType.SUCCESS,
    })
    readonly type = AsyncResultType.SUCCESS;
    @ApiProperty()
    readonly data: T;

    constructor(data: T) {
        super();
        this.data = data;
    }
}

export class Failure<T, E extends Error> extends AsyncResult<T, E> {
    @ApiProperty({
        enum: AsyncResultType,
        enumName: 'AsyncResultType',
        default: AsyncResultType.FAILURE,
    })
    readonly type = AsyncResultType.FAILURE;
    @ApiProperty()
    readonly error: E;

    constructor(error: E) {
        super();
        this.error = error;
    }
}

export const AsyncResultSchema = (payloadRef: string) => {
    return {
        oneOf: [
            { $ref: getSchemaPath(Pending) },
            {
                allOf: [
                    { $ref: getSchemaPath(Success) },
                    {
                        type: 'object',
                        properties: { data: { $ref: payloadRef } },
                    },
                ],
            },
            {
                allOf: [
                    { $ref: getSchemaPath(Failure) },
                    {
                        type: 'object',
                        properties: {
                            error: {
                                type: 'object',
                                properties: { message: { type: 'string' } },
                                required: ['message'],
                            },
                        },
                    },
                ],
            },
        ],
        discriminator: {
            propertyName: 'type',
            mapping: {
                [AsyncResultType.PENDING]: getSchemaPath(Pending),
                [AsyncResultType.SUCCESS]: getSchemaPath(Success),
                [AsyncResultType.FAILURE]: getSchemaPath(Failure),
            },
        },
    };
};
