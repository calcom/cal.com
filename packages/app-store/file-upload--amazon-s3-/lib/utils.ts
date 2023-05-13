import AWS from "aws-sdk";
import type { FileWithPath } from "react-dropzone";

import { getEventTypeAppData } from "@calcom/app-store/utils";

export const uploadFiles = async (responses, eventType) => {
  const appData = getEventTypeAppData(eventType, "file-upload--amazon-s3-");

  for (const [key, value] of Object.entries(responses)) {
    if (value instanceof File) {
      const file = value as FileWithPath;
      const location = await uploadToS3(file, appData);
      responses[key] = location;
    }
  }
  return responses;
};

const uploadToS3 = async (file: FileWithPath, { awsAccessKeyId, awsSecretAccessId, s3Region, s3Bucket }) => {
  AWS.config.update({
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessId,
    region: s3Region,
    signatureVersion: "v4",
  });

  const params = {
    Bucket: s3Bucket,
    Key: `${Date.now()}.${file.name}`,
    Body: file,
  };

  const s3 = new AWS.S3();

  try {
    const { Location } = await s3.upload(params).promise();
    return Location;
  } catch (error) {
    console.log("Error", error);
    throw new Error("Error uploading file to S3");
  }
};
