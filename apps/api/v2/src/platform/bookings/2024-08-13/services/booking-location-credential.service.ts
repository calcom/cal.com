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
    const credentialId = this.resolveCredentialId(reference, userCredentials);
    if (!credentialId) {
      return null;
    }
    return CredentialRepository.findCredentialForCalendarServiceById({ id: credentialId });
  }

  private resolveCredentialId(
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
  ): number | null {
    if (reference.delegationCredentialId) {
      const delegationCred = userCredentials.find(
        (cred) => cred.delegationCredentialId === reference.delegationCredentialId
      );
      if (delegationCred) return delegationCred.id;
    }

    if (reference.credentialId && reference.credentialId > 0) {
      const localCred = userCredentials.find((cred) => cred.id === reference.credentialId);
      return localCred?.id ?? reference.credentialId;
    }

    const typeCred = userCredentials.find((cred) => cred.type === reference.type);
    return typeCred?.id ?? null;
  }
}
