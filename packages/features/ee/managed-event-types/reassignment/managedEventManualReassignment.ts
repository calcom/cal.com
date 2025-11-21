import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { prisma } from "@calcom/prisma";

import {
  ManagedEventManualReassignmentService,
  type ManagedEventManualReassignmentParams,
} from "./services/ManagedEventManualReassignmentService";

const managedEventManualReassignmentService = new ManagedEventManualReassignmentService({
  prisma,
  bookingRepository: new BookingRepository(prisma),
  userRepository: new UserRepository(prisma),
});

export async function managedEventManualReassignment(params: ManagedEventManualReassignmentParams) {
  return managedEventManualReassignmentService.execute(params);
}

export default managedEventManualReassignment;
