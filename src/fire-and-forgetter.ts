import { createCounter } from "./counter";
import ClosingError from "./errors/closing-error";
import TimeoutClosingError from "./errors/timeout-closing-error";

type InternalOptions = {
  defaultOnError: (error) => void;
  throwOnClosing: boolean;
};

type Options = Partial<InternalOptions>;

type FireAndForgetter = {
  close: (options?: CloseOptions) => Promise<void>;
} & ((func: () => Promise<void>, onError?: (error) => void) => void);

type CloseOptions = {
  timeout: number;
};

const defaultOptions: InternalOptions = {
  defaultOnError: (error) => console.error(error),
  throwOnClosing: true,
};

/**
 * Get a new instance of the fire and forgetter lib.
 *
 * @export
 * @param {*} [options={
 *     defaultOnError: (error) => console.error(error),
 *     throwOnClosing: true
 * }]
 * @returns a fire and forgetter object instance.
 */
export function fireAndForgetter(options?: Options): FireAndForgetter {
  const counter = createCounter();
  let closing = false;

  const { defaultOnError, throwOnClosing } = { ...defaultOptions, ...options };

  /**
   * Execute a function in fire and forget mode.
   *
   * @param {() => Promise<void>} func function executed in fire and forget mode. It must return a promise.
   * @param {(error: any) => void} [onError=options.defaultOnError] error callback to handle function rejection.
   * @throws {ClosingError} when close function is called this error will be thrown.
   */
  function fireAndForget(
    func: () => Promise<void>,
    onError: (error) => void = defaultOnError
  ): void {
    if (closing) {
      handleClosing(onError);
      return;
    }
    counter.incrementCounter();
    func()
      .catch(onError)
      .finally(() => counter.decrementCounter());
  }

  function handleClosing(onError: (error) => void) {
    const closingError = new ClosingError(
      "Cannot longer execute fire and forget operation as is closing or closed"
    );
    if (throwOnClosing) {
      throw closingError;
    } else {
      onError(closingError);
    }
  }

  /**
   * close the fire and forgetter instance.
   * The function will return a promise that will resolve once all fire and forget operations are done.
   * Also, any new fire and forget function requested will throw a ClosingError when throwOnClosing is set to true.
   *
   * @param {{ timeout: number }} [closeOptions={ timeout: 0 }] if timeout is > 0 the function
   * will throw a TimeoutClosingError if fire and forget operations do not complete before the set timeout.
   * default timeout value is 0, means no timeout.
   * @returns {Promise<void>}
   * @throws {TimeoutClosingError} when fire and forget operations do not complete before the set timeout.
   */
  function close(closeOptions: CloseOptions = { timeout: 0 }): Promise<void> {
    closing = true;
    return new Promise<void>((resolve, reject) => {
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
        setTimeout(
          () =>
            reject(
              new TimeoutClosingError(
                `Cannot close after ${timeout}ms, ${counter.getCount()} fire and forget operations are still in progress`
              )
            ),
          timeout
        );
      }
    });
  }
  fireAndForget.close = close;

  return fireAndForget;
}
