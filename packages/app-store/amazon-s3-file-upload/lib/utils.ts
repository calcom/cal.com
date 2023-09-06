import type { FileWithPath } from "react-dropzone";
import { z } from "zod";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { getEventTypeAppData } from "../../utils";
import type { QueryParamSchemaT } from "../zod";
import { appDataSchema } from "../zod";

const slug = "amazon-s3-file-upload";

const getPreSignedUrl = async ({ bucket, region, name, type, credentialId }: QueryParamSchemaT) => {
  const req = await fetch(
    `${WEBAPP_URL}/api/integrations/${slug}/link?name=${name}&type=${type}&region=${region}&bucket=${bucket}&credentialId=${credentialId}`
  );
  const data = await req.json();

  return z.object({ url: z.string(), key: z.string() }).parse(data);
};

export const checkForFileUploads = async (responses: Record<any, any>, eventType: any) => {
  const appData = appDataSchema.parse(getEventTypeAppData(eventType, slug));

  for (const [key, value] of Object.entries(responses)) {
    if (value instanceof File) {
      const file = value as FileWithPath;
      const fileType = file.type;
      const bucketName = appData.s3Bucket;
      const fileName = file.name;
      const region = appData.s3Region;

      const { key: fileKey, url } = await getPreSignedUrl({
        name: fileName,
        type: fileType,
        bucket: bucketName,
        region: region,
        credentialId: appData.credentialId ?? -1,
      });

      const formData = new FormData();

      formData.append(fileKey, file);

      const upload = await fetch(url, {
        method: "PUT",
        body: formData,
      });

      if (upload.ok) {
        const s3FileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileKey}`;
        responses[key] = s3FileUrl;
      } else {
        throw new Error("an error occured: file not uploaded");
      }
    }
  }
  return responses;
};
