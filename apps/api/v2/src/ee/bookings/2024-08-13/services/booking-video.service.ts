import type { CredentialForCalendarService } from "@calcom/platform-libraries";
import { CredentialRepository } from "@calcom/platform-libraries";
import { deleteMeeting, FAKE_DAILY_CREDENTIAL } from "@calcom/platform-libraries/conferencing";
import { Injectable, Logger } from "@nestjs/common";
import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/bookings.repository";

@Injectable()
export class BookingVideoService_2024_08_13 {
  private readonly logger = new Logger("BookingVideoService_2024_08_13");

  constructor(private readonly bookingsRepository: BookingsRepository_2024_08_13) {}

  async deleteOldVideoMeetingIfNeeded(bookingId: number): Promise<void> {
    const booking = await this.bookingsRepository.getBookingByIdWithUserAndEventDetails(bookingId);
    if (!booking || !booking.user) {
      return;
    }

    const videoReferences = booking.references.filter(
      (ref) => (ref.type.endsWith("_video") || ref.type.endsWith("_conferencing")) && !ref.deleted && ref.uid
    );

    for (const reference of videoReferences) {
      const credential = await this.findCredentialForVideoReference(reference, booking.user.credentials);

      if (credential && reference.uid) {
        try {
          await deleteMeeting(credential, reference.uid);
          this.logger.log(
            `deleteOldVideoMeetingIfNeeded - Deleted video meeting for reference id=${reference.id}, type=${reference.type}`
          );
        } catch (error) {
          this.logger.warn(
            `deleteOldVideoMeetingIfNeeded - Failed to delete video meeting for reference id=${reference.id}`,
            error instanceof Error ? error.message : String(error)
          );
        }
      }
    }
  }

  async findCredentialForVideoReference(
    reference: {
      credentialId: number | null;
      delegationCredentialId: string | null;
      type: string;
    },
    userCredentials: Array<{
      id: number;
      delegationCredentialId: string | null;
      type: string;
    }>
  ): Promise<CredentialForCalendarService | null> {
    if (reference.credentialId && reference.credentialId > 0) {
      const localCred = userCredentials.find(
        (cred) =>
          cred.id === reference.credentialId &&
          (cred.type.endsWith("_video") || cred.type.endsWith("_conferencing"))
      );
      if (localCred) {
        return CredentialRepository.findCredentialForCalendarServiceById({
          id: localCred.id,
        });
      }

      return CredentialRepository.findCredentialForCalendarServiceById({
        id: reference.credentialId,
      });
    }

    const typeCred = userCredentials.find((cred) => cred.type === reference.type);
    if (typeCred) {
      return CredentialRepository.findCredentialForCalendarServiceById({
        id: typeCred.id,
      });
    }

    return null;
  }

  async findVideoCredentialForIntegration(
    integrationSlug: string,
    userCredentials: Array<{
      id: number;
      type: string;
      delegationCredentialId: string | null;
    }>
  ): Promise<CredentialForCalendarService | null> {
    if (integrationSlug === "cal-video") {
      return { ...FAKE_DAILY_CREDENTIAL };
    }

    const integrationToCredentialTypeMap = {
      zoom: "zoom_video",
      "whereby-video": "whereby_video",
      "webex-video": "webex_video",
      tandem: "tandem_video",
      jitsi: "jitsi_video",
      huddle: "huddle01_video",
      "office365-video": "office365_video",
    } as const;

    const credentialType =
      integrationSlug in integrationToCredentialTypeMap
        ? integrationToCredentialTypeMap[integrationSlug as keyof typeof integrationToCredentialTypeMap]
        : undefined;

    const matchingCred = userCredentials.find((cred) => {
      if (credentialType) {
        return cred.type === credentialType;
      }
      const normalizedSlug = integrationSlug.replace(/-/g, "_");
      return cred.type.includes(normalizedSlug) || cred.type.includes(normalizedSlug.replace("_video", ""));
    });

    if (!matchingCred) {
      return null;
    }

    return CredentialRepository.findCredentialForCalendarServiceById({
      id: matchingCred.id,
    });
  }
}
