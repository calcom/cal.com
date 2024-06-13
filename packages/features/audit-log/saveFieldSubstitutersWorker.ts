import { isMainThread, Worker, workerData } from "node:worker_threads";

import { FieldSubstituterOption } from "./types/TFieldSubstituterInput";
import type TFieldSubstituterInput from "./types/TFieldSubstituterInput";
import {
  substituteEventTypeDelete,
  substituteEventTypeDeleteMany,
  substituteUserCreate,
  substituteUserUpdate,
  substituteUserDelete,
  substituteTeamDelete,
} from "./util/saveFieldSubstituter";

let saveFieldSubstitutersWorker: (input: TFieldSubstituterInput) => Promise<void> = async (
  _input: TFieldSubstituterInput
) => {
  // Default implementation that does nothing
};

if (isMainThread) {
  saveFieldSubstitutersWorker = (input: TFieldSubstituterInput) => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(__filename, { workerData: input });
      worker.on("message", resolve);
      worker.on("error", reject);
      worker.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  };
} else {
  (async () => {
    switch (workerData.triggeredEvent) {
      case FieldSubstituterOption.EventTypeDelete:
        await substituteEventTypeDelete(workerData.deletedEventType);
        break;
      case FieldSubstituterOption.EventTypeDeleteMany:
        await substituteEventTypeDeleteMany(workerData.deletedEventTypes);
        break;
      case FieldSubstituterOption.UserCreate:
        await substituteUserCreate(workerData.createdUser);
        break;
      case FieldSubstituterOption.UserUpdate:
        await substituteUserUpdate(workerData.prevUser, workerData.updatedUser);
        break;
      case FieldSubstituterOption.UserDelete:
        await substituteUserDelete(workerData.deletedUser);
        break;
      case FieldSubstituterOption.TeamDelete:
        await substituteTeamDelete(workerData.deletedTeam);
        break;
      default:
        // console.warn(`Unhandled audit log event type: ${workerData.triggeredEvent}`);
        break;
    }
  })();
}

export default saveFieldSubstitutersWorker;
