import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/bookings.repository";
import { OutputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/output.service";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";

import {
  getRecordingsOfCalVideoByRoomName,
  getAllTranscriptsAccessLinkFromRoomName,
} from "@calcom/platform-libraries";

@Injectable()
export class CalVideoService {
  private readonly logger = new Logger("CalVideoService");
  constructor(
    private readonly bookingsRepository: BookingsRepository_2024_08_13,
    private readonly outputService: OutputBookingsService_2024_08_13
  ) {}

  async getRecordings(bookingUid: string) {
    const booking = await this.bookingsRepository.getByUidWithBookingReference(bookingUid);
    if (!booking) {
      throw new NotFoundException(`Booking with uid=${bookingUid} was not found in the database`);
    }

    const roomName =
      booking?.references?.filter((reference) => reference.type === "daily_video")?.pop()?.meetingId ??
      undefined;
    if (!roomName) {
      throw new NotFoundException(`No Cal Video reference found with booking uid ${bookingUid}`);
    }

    const recordings = await getRecordingsOfCalVideoByRoomName(roomName);

    if (!recordings || !("data" in recordings)) return [];

    return this.outputService.getOutputBookingRecordings(recordings.data);
  }

  async getTranscripts(bookingUid: string) {
    const booking = await this.bookingsRepository.getByUidWithBookingReference(bookingUid);
    if (!booking) {
      throw new NotFoundException(`Booking with uid=${bookingUid} was not found in the database`);
    }

    const roomName =
      booking?.references?.filter((reference) => reference.type === "daily_video")?.pop()?.meetingId ??
      undefined;

    if (!roomName) {
      throw new NotFoundException(`No Cal Video reference found with booking uid ${bookingUid}`);
    }

    const transcripts = await getAllTranscriptsAccessLinkFromRoomName(roomName);

    return transcripts;
  }
}
