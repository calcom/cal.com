import type { CredentialForCalendarService } from "@calcom/platform-libraries";
import { CredentialRepository } from "@calcom/platform-libraries";
import { Injectable } from "@nestjs/common";

@Injectable()
export class BookingLocationCredentialService_2024_08_13 {
  async getCredentialForReference(
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
    if (reference.delegationCredentialId) {
      const delegationCred = userCredentials.find(
        (cred) => cred.delegationCredentialId === reference.delegationCredentialId
      );
      if (delegationCred) {
        const credFromDB = await CredentialRepository.findCredentialForCalendarServiceById({
          id: delegationCred.id,
        });
        return credFromDB;
      }
    }

    if (reference.credentialId && reference.credentialId > 0) {
      const localCred = userCredentials.find((cred) => cred.id === reference.credentialId);
      if (localCred) {
        const credFromDB = await CredentialRepository.findCredentialForCalendarServiceById({
          id: localCred.id,
        });
        return credFromDB;
      }

      const credFromDB = await CredentialRepository.findCredentialForCalendarServiceById({
        id: reference.credentialId,
      });
      return credFromDB;
    }

    const typeCred = userCredentials.find((cred) => cred.type === reference.type);
    if (typeCred) {
      const credFromDB = await CredentialRepository.findCredentialForCalendarServiceById({
        id: typeCred.id,
      });
      return credFromDB;
    }

    return null;
  }
}
