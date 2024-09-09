import { type Tasker, type TaskTypes } from "./tasker";
/**
 * This is the default internal Tasker that uses the Task repository to create tasks.
 * It doens't have any external dependencies and is suitable for most use cases.
 * To use a different Tasker, you can create a new class that implements the Tasker interface.
 * Then, you can use the TaskerFactory to select the new Tasker.
 */
export declare class InternalTasker implements Tasker {
    create(type: TaskTypes, payload: string): Promise<string>;
    processQueue(): Promise<void>;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=internal-tasker.d.ts.map