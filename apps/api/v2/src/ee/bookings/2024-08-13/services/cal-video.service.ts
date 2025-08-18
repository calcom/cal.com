import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/bookings.repository";
import { OutputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/output.service";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";

import {
  getRecordingsOfCalVideoByRoomName,
  getAllTranscriptsAccessLinkFromRoomName,
  getDownloadLinkOfCalVideoByRecordingId,
} from "@calcom/platform-libraries/conferencing";

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

    const recordingWithDownloadLink = recordings.data.map((recording) => {
      return getDownloadLinkOfCalVideoByRecordingId(recording.id)
        .then((res: { download_link: string } | undefined) => ({
          id: recording.id,
          roomName: recording.room_name,
          startTs: recording.start_ts,
          status: recording.status,
          maxParticipants: recording.max_participants,
          duration: recording.duration,
          shareToken: recording.share_token,
          downloadLink: res?.download_link,
        }))
        .catch((err: Error) => ({
          id: recording.id,
          roomName: recording.room_name,
          startTs: recording.start_ts,
          status: recording.status,
          maxParticipants: recording.max_participants,
          duration: recording.duration,
          shareToken: recording.share_token,
          downloadLink: null,
          error: err.message,
        }));
    });
    const allRecordingsWithDownloadLink = await Promise.all(recordingWithDownloadLink);

    return allRecordingsWithDownloadLink;
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
