import { type Prisma } from "@prisma/client";

import db from "@calcom/prisma";

import { type TaskTypes } from "./tasker";

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

const whereUpcomingTasks: Prisma.TaskWhereInput = {
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
    return newTask.id;
  }

  static async getNextBatch() {
    return db.task.findMany({
      where: whereUpcomingTasks,
      orderBy: {
        scheduledAt: "asc",
      },
      take: 100,
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
      where: whereUpcomingTasks,
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

  static async retry(taskId: string, lastError?: string) {
    return db.task.update({
      where: {
        id: taskId,
      },
      data: {
        attempts: { increment: 1 },
        lastError,
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

  static async cleanup() {
    return db.task.deleteMany({
      where: {
        OR: [
          // Get tasks that have succeeded
          whereSucceeded,
          // Get tasks where maxAttemps has been reached
          whereMaxAttemptsReached,
        ],
      },
    });
  }
}
