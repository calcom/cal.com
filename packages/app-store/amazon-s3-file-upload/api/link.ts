import S3 from "aws-sdk/clients/s3";
import type { NextApiRequest, NextApiResponse } from "next";
import { uuid } from "short-uuid";
import { z } from "zod";

import prisma from "@calcom/prisma";

import { appKeysSchema, queryParamSchema } from "../zod";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const queryParams = queryParamSchema.extend({ credentialId: z.string() }).parse(req.query);

  const credentials = await prisma?.credential.findFirst({
    where: {
      type: "amazon-s3-file-upload_other",
      id: Number(queryParams.credentialId),
    },
    select: {
      key: true,
    },
  });

  const parsedCredentials = appKeysSchema.parse(credentials?.key);

  const s3 = new S3({
    accessKeyId: parsedCredentials.client_id,
    secretAccessKey: parsedCredentials.client_secret,
    region: queryParams.region,
    signatureVersion: "v4",
  });

  const Key = `${uuid()}-${queryParams.name}`;

  const preSignedUrl = s3.getSignedUrl("putObject", {
    Bucket: queryParams.bucket,
    Key,
    ContentType: queryParams.type,
    Expires: 5 * 60,
  });

  res.status(200).json({
    url: preSignedUrl,
    key: Key,
  });
}
