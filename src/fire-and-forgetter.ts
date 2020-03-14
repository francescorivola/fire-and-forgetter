import { createCounter } from "./counter";
import ClosingError from "./errors/closing-error";
import TimeoutClosingError from "./errors/timeout-closing-error";

type Options = {
    defaultOnError: (error: Error) => void;
};

type FireAndForgetter = {
    close: (options?: CloseOptions) => Promise<void>;
} & ((func: () => Promise<void>, onError?: (error: Error) => void) => void);

type CloseOptions = {
    timeout: number;
}

const defaultOptions: Options = {
    defaultOnError: (error) => console.error(error),
}

/**
 * Get a new instance of the fire and forgetter lib.
 *
 * @export
 * @param {*} [options={
 *     defaultOnError: (error) => console.error(error),
 * }]
 * @returns a fire and forgetter object instance.
 */
export function fireAndForgetter(options: Options = defaultOptions): FireAndForgetter {

    const counter = createCounter();
    let closing = false;

    async function executeFireAndForget(func: () => Promise<void>): Promise<void> {
        try {
            counter.incrementCounter();
            await func();
        } finally {
            counter.decrementCounter();
        }
    }

    /**
     * Execute a function in fire and forget mode.
     *
     * @param {() => Promise<void>} func function executed in fire and forget mode. It must return a promise.
     * @param {(error: Error) => void} [onError=options.defaultOnError] error callback to handle function rejection.
     * @throws {ClosingError} when close function is called this error will be thrown.
     */
    function fireAndForget(func: () => Promise<void>, onError: (error: Error) => void = options.defaultOnError): void {
        if (closing) {
            throw new ClosingError("Cannot longer execute fire and forget operation as is closing or closed");
        }
        executeFireAndForget(func).catch(onError);
    }

    /**
     * close the fire and forgetter instance.
     * The function will return a promise that will resolve once all fire and forget operations are done.
     * Also, any new fire and forget function requested will throw a ClosingError.
     *
     * @param {{ timeout: number }} [closeOptions={ timeout: 0 }] if timeout is > 0 the function
     * will throw a TimeoutClosingError if fire and forget operations do not complete before the set timeout.
     * default timeout value is 0, means no timeout.
     * @returns {Promise<void>}
     * @throws {TimeoutClosingError} when fire and forget operations do not complete before the set timeout.
     */
    function close(closeOptions: CloseOptions = { timeout: 0 }): Promise<void> {
        closing = true;
        return new Promise((resolve, reject) => {
            if (counter.getCount() === 0) {
                resolve();
                return;
            }
            counter.registerSubscriberToCounterChanges((count) => {
                if (count === 0) {
                    resolve();
                }
            });
            const { timeout } = closeOptions;
            if (timeout > 0) {
                setTimeout(() => reject(new TimeoutClosingError(`Cannot close after ${timeout}ms, ${counter.getCount()} fire and forget operations are still in progress`)), timeout);
            }
        });
    }
    fireAndForget.close = close;

    return fireAndForget;
}
