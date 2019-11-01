import { EventEmitter } from "events";

export function createCounter() {

    const eventEmitter: EventEmitter = new EventEmitter();
    let count: number = 0;

    return {
        incrementCounter() {
            count++;
            eventEmitter.emit("counterUpdate", count);
        },
        decrementCounter() {
            count--;
            eventEmitter.emit("counterUpdate", count);
        },
        getCount() {
            return count;
        },
        registerSubscriberToCounterChanges(callback: (count: number) => void) {
            eventEmitter.on("counterUpdate", callback);
        },
    };
}
