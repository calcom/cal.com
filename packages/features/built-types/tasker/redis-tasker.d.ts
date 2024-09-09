import { type Tasker, type TaskTypes } from "./tasker";
/**
 * RedisTasker is a tasker that uses Redis as a backend.
 * WIP: This is a work in progress and is not fully implemented yet.
 **/
export declare class RedisTasker implements Tasker {
    create(type: TaskTypes, payload: string): Promise<string>;
    processQueue(): Promise<void>;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=redis-tasker.d.ts.map