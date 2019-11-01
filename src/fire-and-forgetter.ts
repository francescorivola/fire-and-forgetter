import { createCounter } from "./counter";
import ClosingError from "./errors/closing-error";
import TimeoutClosingError from "./errors/timeout-closing-error";

export function fireAndForgetter(options = {
    // tslint:disable-next-line: no-console
    defaultOnError: (error) => console.error(error),
}) {

    const counter = createCounter();
    let closing = false;

    function fireAndForget(func: () => Promise<void>, onError: (error: Error) => void = options.defaultOnError): void {
        if (closing) {
            throw new ClosingError("Cannot longer execute fire and forget operation as is closing or closed");
        }
        executeFireAndForget(func).catch(onError);
    }

    fireAndForget.close = function close(timeout: number = 0): Promise<void> {
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
            if (timeout > 0) {
                setTimeout(() => reject(new TimeoutClosingError(`Cannot close after ${timeout}ms, ${counter.getCount()} fire and forget operations are still in progress`)), timeout);
            }
        });
    };

    async function executeFireAndForget(func: () => Promise<void>): Promise<void> {
        try {
            counter.incrementCounter();
            await func();
        } finally {
            counter.decrementCounter();
        }
    }

    return fireAndForget;
}
