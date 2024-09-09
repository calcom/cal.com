import { type TaskTypes } from "./tasker";
export declare class Task {
    static create(type: TaskTypes, payload: string, options?: {
        scheduledAt?: Date;
        maxAttempts?: number;
    }): Promise<string>;
    static getNextBatch(): Promise<{
        type: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        payload: string;
        scheduledAt: Date;
        succeededAt: Date | null;
        attempts: number;
        maxAttempts: number;
        lastError: string | null;
    }[]>;
    static getAll(): Promise<{
        type: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        payload: string;
        scheduledAt: Date;
        succeededAt: Date | null;
        attempts: number;
        maxAttempts: number;
        lastError: string | null;
    }[]>;
    static getFailed(): Promise<{
        type: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        payload: string;
        scheduledAt: Date;
        succeededAt: Date | null;
        attempts: number;
        maxAttempts: number;
        lastError: string | null;
    }[]>;
    static getSucceeded(): Promise<{
        type: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        payload: string;
        scheduledAt: Date;
        succeededAt: Date | null;
        attempts: number;
        maxAttempts: number;
        lastError: string | null;
    }[]>;
    static count(): Promise<number>;
    static countUpcoming(): Promise<number>;
    static countFailed(): Promise<number>;
    static countSucceeded(): Promise<number>;
    static retry(taskId: string, lastError?: string): Promise<{
        type: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        payload: string;
        scheduledAt: Date;
        succeededAt: Date | null;
        attempts: number;
        maxAttempts: number;
        lastError: string | null;
    }>;
    static succeed(taskId: string): Promise<{
        type: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        payload: string;
        scheduledAt: Date;
        succeededAt: Date | null;
        attempts: number;
        maxAttempts: number;
        lastError: string | null;
    }>;
    static cancel(taskId: string): Promise<{
        type: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        payload: string;
        scheduledAt: Date;
        succeededAt: Date | null;
        attempts: number;
        maxAttempts: number;
        lastError: string | null;
    }>;
    static cleanup(): Promise<import("@prisma/client/runtime/library").GetBatchResult>;
}
//# sourceMappingURL=repository.d.ts.map