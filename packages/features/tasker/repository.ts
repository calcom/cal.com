import { type Prisma } from "@prisma/client";

import db from "@calcom/prisma";

import { type TaskTypes } from "./tasker";

const whereSucceeded: Prisma.TaskWhereInput = {
  succeededAt: { not: null },
};

const whereMaxAttempsReached: Prisma.TaskWhereInput = {
  attempts: {
    equals: {
      // @ts-expect-error prisma is tripping: '_ref' does not exist in type 'FieldRef<"Task", "Int">'
      _ref: "maxAttempts",
      _container: "Task",
    },
  },
};

const upcomingTasksWhere: Prisma.TaskWhereInput = {
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
};

export class Task {
  static async create(
    type: TaskTypes,
    payload: string,
    options: { scheduledAt?: Date; maxAttempts?: number } = {}
  ) {
    const { scheduledAt, maxAttempts } = options;
    const newTask = await db.task.create({
      data: {
        payload,
        type,
        scheduledAt,
        maxAttempts,
      },
    });
    return newTask;
  }
  static async getNextBatch() {
    const tasks = await db.task.findMany({
      where: upcomingTasksWhere,
      orderBy: {
        scheduledAt: "asc",
      },
      take: 100,
    });
    return tasks;
  }
  static async getAll() {
    const tasks = await db.task.findMany();
    return tasks;
  }
  static async getFailed() {
    const tasks = await db.task.findMany({
      where: whereMaxAttempsReached,
    });
    return tasks;
  }
  static async getSucceeded() {
    const tasks = await db.task.findMany({
      where: whereSucceeded,
    });
    return tasks;
  }
  static async count() {
    const tasks = await db.task.count();
    return tasks;
  }
  static async countUpcoming() {
    const tasks = await db.task.count({
      where: upcomingTasksWhere,
    });
    return tasks;
  }
  static async countFailed() {
    const tasks = await db.task.count({
      where: whereMaxAttempsReached,
    });
    return tasks;
  }
  static async countSucceeded() {
    const tasks = await db.task.count({
      where: whereSucceeded,
    });
    return tasks;
  }
  static async retry(taskId: number, lastError?: string) {
    const task = await db.task.update({
      where: {
        id: taskId,
      },
      data: {
        attempts: { increment: 1 },
        lastError,
      },
    });
    return task;
  }
  static async succeed(taskId: number) {
    const task = await db.task.update({
      where: {
        id: taskId,
      },
      data: {
        attempts: { increment: 1 },
        succeededAt: new Date(),
      },
    });
    return task;
  }
  static async cancel(taskId: number) {
    const task = await db.task.delete({
      where: {
        id: taskId,
      },
    });
    return task;
  }
  static async cleanup() {
    const task = await db.task.deleteMany({
      where: {
        OR: [
          // Get tasks that have succeeded
          whereSucceeded,
          // Get tasks where maxAttemps has been reached
          whereMaxAttempsReached,
        ],
      },
    });
    return task.count;
  }
}
