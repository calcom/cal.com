import { markCredentialAsUnreachable } from "@calcom/lib/markCredentialAsUnreachable";
import prisma from "@calcom/prisma";
import type { CredentialPayload } from "@calcom/types/Credential";

export const invalidateCredential = async (credentialId: CredentialPayload["id"]) => {
  const credential = await prisma.credential.findUnique({
    where: {
      id: credentialId,
    },
  });

  if (credential) {
    await prisma.credential.update({
      where: {
        id: credentialId,
      },
      data: {
        invalid: true,
      },
    });

    // Also mark as unreachable and send notification if appropriate
    await markCredentialAsUnreachable(credentialId, "Credential invalidated due to authentication failure");
  }
};
