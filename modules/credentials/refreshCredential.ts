import prisma from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { CredentialPayload } from "@calcom/types/Credential";


export async function refreshCredential(credential: CredentialPayload): Promise<CredentialPayload> {
    const newCredential = await prisma.credential.findUnique({
      where: {
        id: credential.id,
      },
      select: credentialForCalendarServiceSelect,
    });
  
    if (!newCredential) {
      return credential;
    } else {
      return newCredential;
    }
  }
  