import { createContainer } from "@calcom/features/di/di";
import {
  type BookerSlotSnapshotService,
  moduleLoader as bookerSlotSnapshotServiceModuleLoader,
} from "./BookerSlotSnapshotService.module";

const bookerSlotSnapshotServiceContainer = createContainer();

export function getBookerSlotSnapshotService(): BookerSlotSnapshotService {
  bookerSlotSnapshotServiceModuleLoader.loadModule(bookerSlotSnapshotServiceContainer);
  return bookerSlotSnapshotServiceContainer.get<BookerSlotSnapshotService>(
    bookerSlotSnapshotServiceModuleLoader.token
  );
}
