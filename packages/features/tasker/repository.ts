import db from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

import { type TaskTypes } from "./tasker";
import { scanWorkflowBodySchema } from "./tasks/scanWorkflowBody";

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
  // Get only tasks that have not been claimed or were claimed more than 5 minutes ago (stale claims)
  OR: [{ claimedAt: null }, { claimedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } }],
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
    console.info("Getting next batch of tasks", makeWhereUpcomingTasks());

    // Use atomic task claiming with SELECT FOR UPDATE SKIP LOCKED
    // This ensures that concurrent workers cannot claim the same tasks
    return db.$transaction(async (tx) => {
      const now = new Date();
      const staleClaimThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

      // Select tasks atomically with row-level locking
      // SKIP LOCKED ensures that rows locked by other transactions are skipped
      const tasks = await tx.$queryRaw<
        Array<{
          id: string;
          createdAt: Date;
          updatedAt: Date;
          scheduledAt: Date;
          succeededAt: Date | null;
          type: string;
          payload: string;
          attempts: number;
          maxAttempts: number;
          lastError: string | null;
          lastFailedAttemptAt: Date | null;
          referenceUid: string | null;
          claimedAt: Date | null;
        }>
      >`
        SELECT * FROM "Task"
        WHERE "succeededAt" IS NULL
          AND ("claimedAt" IS NULL OR "claimedAt" < ${staleClaimThreshold})
          AND "scheduledAt" < ${now}
          AND "attempts" < "maxAttempts"
        ORDER BY "scheduledAt" ASC
        LIMIT 1000
        FOR UPDATE SKIP LOCKED
      `;

      if (tasks.length === 0) {
        return [];
      }

      // Extract task IDs
      const taskIds = tasks.map((task) => task.id);

      // Atomically mark these tasks as claimed
      await tx.task.updateMany({
        where: {
          id: { in: taskIds },
        },
        data: {
          claimedAt: now,
        },
      });

      return tasks;
    });
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
        claimedAt: null, // Clear claim so task can be picked up again
        ...(updatedScheduledAt && {
          scheduledAt: updatedScheduledAt,
        }),
      },
    });
  }

  static async succeed(taskId: string) {
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

  static async cancelWithReference(referenceUid: string, type: TaskTypes): Promise<{ id: string } | null> {
    // db.task.delete throws an error if the task does not exist, so we catch it and return null
    try {
      return await db.task.delete({
        where: {
          referenceUid_type: {
            referenceUid,
            type,
          },
        },
        select: {
          id: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        // P2025 is the error code for "Record to delete does not exist"
        console.warn(`Task with reference ${referenceUid} and type ${type} does not exist. No action taken.`);
        return null;
      }
      throw error;
    }
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

  static async hasNewerScanTaskForStepId(workflowStepId: number, createdAt: string) {
    const tasks = await db.$queryRaw<{ payload: string }[]>`
      SELECT "payload"
      FROM "Task"
      WHERE "type" = 'scanWorkflowBody'
        AND "succeededAt" IS NULL
        AND (payload::jsonb ->> 'workflowStepId')::int = ${workflowStepId}
        `;

    return tasks.some((task) => {
      try {
        const parsed = scanWorkflowBodySchema.parse(JSON.parse(task.payload));
        if (!parsed.createdAt) return false;
        return new Date(parsed.createdAt) > new Date(createdAt);
      } catch {
        return false;
      }
    });
  }
}
