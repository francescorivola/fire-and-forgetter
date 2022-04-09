import ClosingError from "../src/errors/closing-error";
import TimeoutClosingError from "../src/errors/timeout-closing-error";
import fireAndForgetter from "../src/index";

console.error = jest.fn();

function wait(time: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(resolve, time));
}

describe("fire-and-forgetter", () => {
    
    it("close should wait until all fire and forget operations have been fullfilled or rejected", async () => {
        const fireAndForget = fireAndForgetter();

        let count = 0;

        async function doSumeSuffAndIncrementCountAtTheEnd(): Promise<void> {
            await wait(10);
            count++;
            return Promise.resolve();
        }

        async function doSumeSuffAndIncrementCountAtTheEndAndReject(): Promise<void> {
            await wait(10);
            count++;
            return Promise.reject(new Error("ups, some error happened"));
        }

        fireAndForget(() => doSumeSuffAndIncrementCountAtTheEnd());
        fireAndForget(() => doSumeSuffAndIncrementCountAtTheEnd());
        fireAndForget(() => doSumeSuffAndIncrementCountAtTheEnd());
        fireAndForget(() => doSumeSuffAndIncrementCountAtTheEndAndReject());

        await fireAndForget.close();

        expect(count).toBe(4);
    });

    it("close should throw a timeout closing error if timeout is reached and fire and forget operation are still in process", async () => {
        expect.assertions(3);
        const fireAndForget = fireAndForgetter();

        let count = 0;

        async function doSumeSuffAndIncrementCountAtTheEnd(): Promise<void> {
            await wait(1000);
            count++;
            return Promise.resolve();
        }

        fireAndForget(() => doSumeSuffAndIncrementCountAtTheEnd());
        fireAndForget(() => doSumeSuffAndIncrementCountAtTheEnd());
        fireAndForget(() => doSumeSuffAndIncrementCountAtTheEnd());

        try {
            await fireAndForget.close({ timeout: 10 });
        } catch (error) {
            expect(error instanceof TimeoutClosingError).toBe(true);
            expect((error as Error).message).toBe("Cannot close after 10ms, 3 fire and forget operations are still in progress");
            expect(count).toBe(0);
        }
    });

    it("close should resolve when no fire and forget operations are in process", async () => {
        const fireAndForget = fireAndForgetter();
        await expect(fireAndForget.close()).resolves;
    });

    it("fireAndForget should call onError callback when operation rejects", async () => {
        expect.assertions(2);
        const fireAndForget = fireAndForgetter();

        async function doSumeSuffAndReject(): Promise<void> {
            await wait(10);
            return Promise.reject(new Error("ups, some error happened"));
        }

        fireAndForget(() => doSumeSuffAndReject(), (error) => {
            expect(error instanceof Error).toBe(true);
            expect((error as Error).message).toBe("ups, some error happened");
        });

        await fireAndForget.close();
    });

    it("fireAndForget should call defaultOnError callback when operation rejects and no onError callback is set", async () => {
        expect.assertions(2);
        const fireAndForget = fireAndForgetter({
            defaultOnError: (error) => {
                expect(error instanceof Error).toBe(true);
                expect(error.message).toBe("ups, some error happened");
            },
        });

        async function doSumeSuffAndReject(): Promise<void> {
            await wait(10);
            return Promise.reject(new Error("ups, some error happened"));
        }

        fireAndForget(() => doSumeSuffAndReject());

        await fireAndForget.close();
    });

    it("fireAndForget should throw a closing error if fire and forget has been closed", async () => {
        expect.assertions(2);
        const fireAndForget = fireAndForgetter();

        async function doSumeSuffAndIncrementCountAtTheEnd(): Promise<void> {
            await wait(100);
            return Promise.resolve();
        }

        fireAndForget(() => doSumeSuffAndIncrementCountAtTheEnd());

        fireAndForget.close();

        try {
            fireAndForget(() => doSumeSuffAndIncrementCountAtTheEnd());
        } catch (error) {
            expect(error instanceof ClosingError).toBe(true);
            expect((error as Error).message).toBe("Cannot longer execute fire and forget operation as is closing or closed");
        }
    });
});
