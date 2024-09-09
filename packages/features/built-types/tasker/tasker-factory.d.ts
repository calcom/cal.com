import { type Tasker, type TaskerTypes } from "./tasker";
/**
 * This is a factory class that creates Taskers.
 * The TaskerFactory is useful when you want to use a different Tasker in different environments.
 * For example, you can use the InternalTasker in development and the AWSSQSTasker in production.
 */
export declare class TaskerFactory {
    createTasker(type?: TaskerTypes): Tasker;
}
/** Shorthand for getting the default Tasker */
export declare function getTasker(): Tasker;
//# sourceMappingURL=tasker-factory.d.ts.map