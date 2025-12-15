import { generateSecureHash } from "@calid/features/modules/api-keys/utils/hashKey";

import prisma from "@calcom/prisma";

const retrieveValidApiKey = async (authenticationToken: string, applicationIdentifier?: string) => {
  const prefixLength = process.env.API_KEY_PREFIX?.length || 0;
  const tokenWithoutPrefix = authenticationToken.substring(prefixLength);
  const secureHashValue = generateSecureHash(tokenWithoutPrefix);

  const currentTimestamp = new Date(Date.now());

  const authenticatedKey = await prisma.calIdApiKey.findFirst({
    where: {
      hashedKey: secureHashValue,
      appId: applicationIdentifier,
      OR: [
        {
          expiresAt: {
            gte: currentTimestamp,
          },
        },
        {
          expiresAt: null,
        },
      ],
    },
  });

  return authenticatedKey;
};

export default retrieveValidApiKey;
