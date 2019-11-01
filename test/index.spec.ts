import fireAndForgetter from "../src/index";
import TimeoutClosingError from "../src/errors/timeout-closing-error";
import ClosingError from "../src/errors/closing-error";

describe("fire-and-forgetter", () => {

    it("close should wait until all fire and forget operations have been fullfilled or rejected", async () => {
        const fireAndForget = fireAndForgetter();

        let count = 0;

        function doSumeSuffAndIncrementCountAtTheEnd() {
            return new Promise<void>(async (resolve) => {
                await wait(10);
                count++;
                resolve();
            });
        }
        function doSumeSuffAndIncrementCountAtTheEndAndReject() {
            return new Promise<void>(async (resolve, reject) => {
                await wait(10);
                count++;
                reject(new Error("ups, some error happened"));
            });
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

        function doSumeSuffAndIncrementCountAtTheEnd() {
            return new Promise<void>(async (resolve) => {
                await wait(1000);
                count++;
                resolve();
            });
        }

        fireAndForget(() => doSumeSuffAndIncrementCountAtTheEnd());
        fireAndForget(() => doSumeSuffAndIncrementCountAtTheEnd());
        fireAndForget(() => doSumeSuffAndIncrementCountAtTheEnd());

        try {
            await fireAndForget.close(10);
        } catch (error) {
            expect(error instanceof TimeoutClosingError).toBe(true);
            expect(error.message).toBe("Cannot close after 10ms, 3 fire and forget operations are still in progress");
            expect(count).toBe(0);
        }
    });

    it("fireAndForget should call onError callback when operation rejects", async () => {
        expect.assertions(2);
        const fireAndForget = fireAndForgetter();

        function doSumeSuffAndReject() {
            return new Promise<void>(async (resolve, reject) => {
                await wait(10);
                reject(new Error("ups, some error happened"));
            });
        }

        fireAndForget(() => doSumeSuffAndReject(), (error) => {
            expect(error instanceof Error).toBe(true);
            expect(error.message).toBe("ups, some error happened");
        });

        await fireAndForget.close();
    });

    it("fireAndForget should throw a closing error if fire and forget has been closed", async () => {
        expect.assertions(2);
        const fireAndForget = fireAndForgetter();

        function doSumeSuffAndIncrementCountAtTheEnd() {
            return new Promise<void>(async (resolve) => {
                await wait(100);
                resolve();
            });
        }

        fireAndForget(() => doSumeSuffAndIncrementCountAtTheEnd());

        fireAndForget.close();

        try {
            fireAndForget(() => doSumeSuffAndIncrementCountAtTheEnd());
        } catch (error) {
            expect(error instanceof ClosingError).toBe(true);
            expect(error.message).toBe("Cannot longer execute fire and forget operation as is closing or closed");
        }
    });

    function wait(time: number) {
        return new Promise<void>((resolve) => setTimeout(resolve, time));
    }
});
