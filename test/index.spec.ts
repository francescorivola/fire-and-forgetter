import ClosingError from "../src/errors/closing-error";
import TimeoutClosingError from "../src/errors/timeout-closing-error";
import fireAndForgetter from "../src/index";
import { describe, test, mock } from "node:test";
import { equal } from "assert/strict";
import { setTimeout } from "timers/promises";

console.error = mock.fn();

describe("fire-and-forgetter", () => {
  test("close should wait until all fire and forget operations have been fulfilled or rejected", async () => {
    const fireAndForget = fireAndForgetter();

    let count = 0;

    async function doSomeStuffsAndIncrementCountAtTheEnd(): Promise<void> {
      await setTimeout(10);
      count++;
      return Promise.resolve();
    }

    async function doSomeStuffsAndIncrementCountAtTheEndAndReject(): Promise<void> {
      await setTimeout(10);
      count++;
      return Promise.reject(new Error("ups, some error happened"));
    }

    fireAndForget(() => doSomeStuffsAndIncrementCountAtTheEnd());
    fireAndForget(() => doSomeStuffsAndIncrementCountAtTheEnd());
    fireAndForget(() => doSomeStuffsAndIncrementCountAtTheEnd());
    fireAndForget(() => doSomeStuffsAndIncrementCountAtTheEndAndReject());

    await fireAndForget.close();

    equal(count, 4);
  });

  test("close should throw a timeout closing error if timeout is reached and fire and forget operation are still in process", async () => {
    const fireAndForget = fireAndForgetter();
    let functionHasThrownError = false;
    let count = 0;

    async function doSomeStuffsAndIncrementCountAtTheEnd(): Promise<void> {
      await setTimeout(1000);
      count++;
      return Promise.resolve();
    }

    fireAndForget(() => doSomeStuffsAndIncrementCountAtTheEnd());
    fireAndForget(() => doSomeStuffsAndIncrementCountAtTheEnd());
    fireAndForget(() => doSomeStuffsAndIncrementCountAtTheEnd());

    try {
      await fireAndForget.close({ timeout: 10 });
    } catch (error) {
      equal(error instanceof TimeoutClosingError, true);
      equal(
        (error as Error).message,
        "Cannot close after 10ms, 3 fire and forget operations are still in progress"
      );
      equal(count, 0);
      functionHasThrownError = true;
    }
    equal(functionHasThrownError, true);
  });

  test("close should resolve when no fire and forget operations are in process", async () => {
    const fireAndForget = fireAndForgetter();
    await fireAndForget.close();
  });

  test("fireAndForget should call onError callback when operation rejects", async () => {
    let onErrorHasBeenCalled = false;
    const fireAndForget = fireAndForgetter();
    async function doSomeStuffsAndReject(): Promise<void> {
      await setTimeout(10);
      return Promise.reject(new Error("ups, some error happened"));
    }

    fireAndForget(
      () => doSomeStuffsAndReject(),
      (error) => {
        equal(error instanceof Error, true);
        equal((error as Error).message, "ups, some error happened");
        onErrorHasBeenCalled = true;
      }
    );

    await fireAndForget.close();
    equal(onErrorHasBeenCalled, true);
  });

  test("fireAndForget should call defaultOnError callback when operation rejects and no onError callback is set", async () => {
    let defaultOnErrorHasBeenCalled = false;
    const fireAndForget = fireAndForgetter({
      defaultOnError: (error) => {
        equal(error instanceof Error, true);
        equal(error.message, "ups, some error happened");
        defaultOnErrorHasBeenCalled = true;
      },
      throwOnClosing: true,
    });

    async function doSomeStuffsAndReject(): Promise<void> {
      await setTimeout(10);
      return Promise.reject(new Error("ups, some error happened"));
    }

    fireAndForget(() => doSomeStuffsAndReject());

    await fireAndForget.close();

    equal(defaultOnErrorHasBeenCalled, true);
  });

  test("fireAndForget should throw a closing error if fire and forget has been closed", async () => {
    let functionHasThrownError = false;
    const fireAndForget = fireAndForgetter();

    async function doSomeStuffsAndIncrementCountAtTheEnd(): Promise<void> {
      await setTimeout(100);
      return Promise.resolve();
    }

    fireAndForget(() => doSomeStuffsAndIncrementCountAtTheEnd());

    fireAndForget.close();

    try {
      fireAndForget(() => doSomeStuffsAndIncrementCountAtTheEnd());
    } catch (error) {
      equal(error instanceof ClosingError, true);
      equal(
        (error as Error).message,
        "Cannot longer execute fire and forget operation as is closing or closed"
      );
      functionHasThrownError = true;
    }

    equal(functionHasThrownError, true);
  });

  test("fireAndForget should not throw a closing error if option throwOnClosing is set to false", async () => {
    let reportedError;
    const fireAndForget = fireAndForgetter({
      throwOnClosing: false,
      defaultOnError: (error) => {
        reportedError = error;
      },
    });

    async function doSomeStuffsAndIncrementCountAtTheEnd(): Promise<void> {
      await setTimeout(100);
      return Promise.resolve();
    }

    fireAndForget(() => doSomeStuffsAndIncrementCountAtTheEnd());

    fireAndForget.close();

    fireAndForget(() => doSomeStuffsAndIncrementCountAtTheEnd());

    equal(reportedError instanceof ClosingError, true);
    equal(
      (reportedError as Error).message,
      "Cannot longer execute fire and forget operation as is closing or closed"
    );
  });
});
