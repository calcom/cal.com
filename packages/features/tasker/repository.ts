import { type Prisma } from "@prisma/client";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import db from "@calcom/prisma";

import { type TaskTypes } from "./tasker";

const log = logger.getSubLogger({ prefix: ["[tasker] repository"] });

const whereSucceeded: Prisma.TaskWhereInput = {
  succeededAt: { not: null },
};

const whereMaxAttemptsReached: Prisma.TaskWhereInput = {
  attempts: {
    equals: {
      // @ts-expect-error prisma is tripping: '_ref' does not exist in type 'FieldRef<"Task", "Int">'
      _ref: "maxAttempts",
      _container: "Task",
    },
  },
};

/** This is a function to ensure new Date is always fresh */
const makeWhereUpcomingTasks = (): Prisma.TaskWhereInput => ({
  // Get only tasks that have not succeeded yet
  succeededAt: null,
  // Get only tasks that are scheduled to run now or in the past
  scheduledAt: {
    lt: new Date(),
  },
  // Get only tasks where maxAttemps has not been reached
  attempts: {
    lt: {
      // @ts-expect-error prisma is tripping: '_ref' does not exist in type 'FieldRef<"Task", "Int">'
      _ref: "maxAttempts",
      _container: "Task",
    },
  },
});

export class Task {
  static async create(
    type: TaskTypes,
    payload: string,
    options: { scheduledAt?: Date; maxAttempts?: number; referenceUid?: string } = {}
  ) {
    const { scheduledAt, maxAttempts, referenceUid } = options;
    console.info("Creating task", { type, payload, scheduledAt, maxAttempts });
    const newTask = await db.task.create({
      data: {
        payload,
        type,
        scheduledAt,
        maxAttempts,
        referenceUid,
      },
    });
    return newTask.id;
  }

  static async getNextBatch() {
    log.info("Getting next batch of tasks", makeWhereUpcomingTasks());
    return db.task.findMany({
      where: makeWhereUpcomingTasks(),
      orderBy: {
        scheduledAt: "asc",
      },
      take: 1000,
    });
  }

  static async getAll() {
    return db.task.findMany();
  }

  static async getFailed() {
    return db.task.findMany({
      where: whereMaxAttemptsReached,
    });
  }

  static async getSucceeded() {
    return db.task.findMany({
      where: whereSucceeded,
    });
  }

  static async count() {
    return db.task.count();
  }

  static async countUpcoming() {
    return db.task.count({
      where: makeWhereUpcomingTasks(),
    });
  }

  static async countFailed() {
    return db.task.count({
      where: whereMaxAttemptsReached,
    });
  }

  static async countSucceeded() {
    return db.task.count({
      where: whereSucceeded,
    });
  }

  static async retry({
    taskId,
    lastError,
    minRetryIntervalMins,
  }: {
    taskId: string;
    lastError?: string;
    minRetryIntervalMins?: number | null;
  }) {
    const failedAttemptTime = new Date();
    const updatedScheduledAt = minRetryIntervalMins
      ? new Date(failedAttemptTime.getTime() + 1000 * 60 * minRetryIntervalMins)
      : undefined;

    return db.task.update({
      where: {
        id: taskId,
      },
      data: {
        attempts: { increment: 1 },
        lastError,
        lastFailedAttemptAt: failedAttemptTime,
        ...(updatedScheduledAt && {
          scheduledAt: updatedScheduledAt,
        }),
      },
    });
  }

  static async succeed(taskId: string) {
    log.info("Mark task as succeeded", { taskId });
    return db.task.update({
      where: {
        id: taskId,
      },
      data: {
        attempts: { increment: 1 },
        succeededAt: new Date(),
      },
    });
  }

  static async cancel(taskId: string) {
    return db.task.delete({
      where: {
        id: taskId,
      },
    });
  }

  static async cleanup() {
    // TODO: Uncomment this later
    // return db.task.deleteMany({
    //   where: {
    //     OR: [
    //       // Get tasks that have succeeded
    //       whereSucceeded,
    //       // Get tasks where maxAttemps has been reached
    //       whereMaxAttemptsReached,
    //     ],
    //   },
    // });
  }

  static async updateProgress({ taskId, payload }: { taskId: string; payload: string }) {
    log.info("Updating task progress", { taskId, payload });
    return db.task.update({
      where: {
        id: taskId,
      },
      data: {
        payload,
      },
    });
  }

  /**
   * Cancels a task based on the payload.
   *
   * If there are accidentally more than one task that matches the payload, it will log an error and won't cancel any task.
   */
  static async cancelWhere(where: { payloadContains: string }) {
    const tasksToCancel = await db.task.findMany({
      where: {
        payload: {
          contains: where.payloadContains,
        },
      },
    });

    if (tasksToCancel.length > 1) {
      // Ensure that we don't accidentally act on wrong set of tasks.
      log.error(
        "Found more than one task to cancel, ignoring the call",
        safeStringify({
          tasksToCancel: tasksToCancel.map((task) => ({
            id: task.id,
            payload: task.payload,
          })),
        })
      );
      return 0;
    }

    const deleted = await db.task.deleteMany({
      where: { id: { in: tasksToCancel.map((task) => task.id) } },
    });

    log.info("Deleted tasks", safeStringify({ count: deleted.count }));
    return deleted.count;
  }
}
