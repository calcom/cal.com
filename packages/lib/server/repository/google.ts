import type { Credentials } from "google-auth-library";

import { CredentialRepository } from "./credential";
import { SelectedCalendarRepository } from "./selectedCalendar";

export class GoogleRepository {
  static async createGoogleCalendarCredential({ userId, key }: { userId: number; key: Credentials }) {
    return await CredentialRepository.create({
      type: "google_calendar",
      key,
      userId,
      appId: "google-calendar",
    });
  }

  static async createGoogleMeetsCredential({ userId }: { userId: number }) {
    return await CredentialRepository.create({
      type: "google_video",
      key: {},
      userId,
      appId: "google-meet",
    });
  }

  static async createSelectedCalendar(data: { credentialId: number; userId: number; externalId: string }) {
    return await SelectedCalendarRepository.create({
      ...data,
      integration: "google_calendar",
    });
  }

  static async findGoogleMeetCredential({ userId }: { userId: number }) {
    return await CredentialRepository.findFirstByUserIdAndType({
      userId,
      type: "google_video",
    });
  }
}
