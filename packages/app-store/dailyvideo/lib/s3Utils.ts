import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

interface S3RecordingInfo {
  s3_bucket: string;
  s3_region: string;
  s3_key: string;
}

export async function deleteRecordingFromS3(recordingInfo: S3RecordingInfo): Promise<void> {
  // biome-ignore lint: Server-side only, env access required
  const accessKeyId = process.env.CAL_VIDEO_AWS_ACCESS_KEY_ID;
  // biome-ignore lint: Server-side only, env access required
  const secretAccessKey = process.env.CAL_VIDEO_AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("CAL_VIDEO_AWS_ACCESS_KEY_ID and CAL_VIDEO_AWS_SECRET_ACCESS_KEY are required");
  }

  const s3Client = new S3Client({
    region: recordingInfo.s3_region,
    credentials: { accessKeyId, secretAccessKey },
  });

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: recordingInfo.s3_bucket,
      Key: recordingInfo.s3_key,
    })
  );
}
