import { EventEmitter } from "events";

type Counter = {
    incrementCounter: () => void;
    decrementCounter: () => void;
    getCount: () => number;
    registerSubscriberToCounterChanges(callback: (count: number) => void): void;
}

export function createCounter(): Counter {

    const eventEmitter: EventEmitter = new EventEmitter();
    let count = 0;

    return {
        incrementCounter(): void {
            count++;
            eventEmitter.emit("counterUpdate", count);
        },
        decrementCounter(): void {
            count--;
            eventEmitter.emit("counterUpdate", count);
        },
        getCount(): number {
            return count;
        },
        registerSubscriberToCounterChanges(callback: (count: number) => void): void {
            eventEmitter.on("counterUpdate", callback);
        },
    };
}
