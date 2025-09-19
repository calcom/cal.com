import { createContainer } from "../../di";
import {
  type InstantBookingCreateService,
  moduleLoader as instantBookingCreateServiceModule,
} from "../modules/InstantBookingCreateService.module";

const container = createContainer();

export function getInstantBookingCreateService(): InstantBookingCreateService {
  instantBookingCreateServiceModule.loadModule(container);
  return container.get<InstantBookingCreateService>(instantBookingCreateServiceModule.token);
}
