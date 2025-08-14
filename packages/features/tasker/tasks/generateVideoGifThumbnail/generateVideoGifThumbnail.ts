import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import ffmpegStatic from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import { createWriteStream, promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

import { IS_CALCOM } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";

import type { GenerateVideoGifThumbnailPayload } from "./schema";

const log = logger.getSubLogger({ prefix: ["generateVideoGifThumbnail"] });

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

const s3Client = new S3Client({
  region: process.env.CAL_VIDEO_BUCKET_REGION,
});

export const generateVideoGifThumbnail = async (payload: string): Promise<void> => {
  if (!IS_CALCOM) {
    log.info("GIF thumbnail generation is only available on Cal.com hosted infrastructure");
    return;
  }

  const data: GenerateVideoGifThumbnailPayload = JSON.parse(payload);
  const { recordingId, downloadUrl, duration } = data;

  log.info("Starting GIF thumbnail generation", { recordingId, downloadUrl, duration });

  const tempDir = tmpdir();
  const videoPath = join(tempDir, `${recordingId}.mp4`);
  const gifPath = join(tempDir, `${recordingId}_thumbnail.gif`);

  try {
    log.info("Downloading video", { downloadUrl });
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const fileStream = createWriteStream(videoPath);
    if (!response.body) {
      throw new Error("No response body received");
    }

    const reader = response.body.getReader();
    const nodeStream = new Readable({
      async read() {
        try {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null);
          } else {
            this.push(value);
          }
        } catch (error) {
          this.destroy(error as Error);
        }
      },
    });

    await pipeline(nodeStream, fileStream);

    let videoDuration = duration;
    if (!videoDuration) {
      videoDuration = await getVideoDuration(videoPath);
    }

    log.info("Generating GIF from video frames", { videoDuration });
    await generateGifFromVideo(videoPath, gifPath, videoDuration);

    log.info("Uploading GIF to S3");
    const gifBuffer = await fs.readFile(gifPath);
    const s3Key = `gifs/${recordingId}_thumbnail.gif`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.CAL_VIDEO_BUCKET_NAME,
        Key: s3Key,
        Body: gifBuffer,
        ContentType: "image/gif",
        CacheControl: "public, max-age=31536000", // 1 year cache
      })
    );

    log.info("GIF thumbnail generation completed successfully", {
      recordingId,
      s3Key,
      gifSize: gifBuffer.length,
    });

    await Promise.all([
      fs.unlink(videoPath).catch((err) => {
        log.debug("Failed to cleanup video file", { error: err });
      }),
      fs.unlink(gifPath).catch((err) => {
        log.debug("Failed to cleanup gif file", { error: err });
      }),
    ]);
  } catch (error) {
    log.error("Failed to generate GIF thumbnail", { recordingId, error });

    await Promise.all([
      fs.unlink(videoPath).catch((err) => {
        log.debug("Failed to cleanup video file", { error: err });
      }),
      fs.unlink(gifPath).catch((err) => {
        log.debug("Failed to cleanup gif file", { error: err });
      }),
    ]);

    throw error;
  }
};

async function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err: Error | null, metadata: { format: { duration?: number } }) => {
      if (err) {
        reject(err);
        return;
      }
      const duration = metadata.format.duration;
      if (!duration) {
        reject(new Error("Could not determine video duration"));
        return;
      }
      resolve(duration);
    });
  });
}

async function generateGifFromVideo(videoPath: string, gifPath: string, duration: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const frameTimes = Array.from({ length: 5 }, (_, i) => (duration / 6) * (i + 1));

    const frameFilters = frameTimes
      .map((time, i) => `[0:v]trim=start=${time}:duration=0.1,setpts=PTS-STARTPTS[f${i}]`)
      .join(";");

    const concatFilter = `[f0][f1][f2][f3][f4]concat=n=5:v=1:a=0[v]`;
    const gifFilter = `[v]fps=1,scale=480:-1:flags=lanczos,palettegen[p];[v][p]paletteuse`;

    const complexFilter = `${frameFilters};${concatFilter};${gifFilter}`;

    ffmpeg(videoPath)
      .complexFilter(complexFilter)
      .outputOptions([
        "-t",
        "5", // 5 second duration
        "-loop",
        "0", // Infinite loop
      ])
      .output(gifPath)
      .on("end", () => {
        log.info("FFmpeg processing completed");
        resolve();
      })
      .on("error", (err: Error) => {
        log.error("FFmpeg processing failed", { error: err });
        reject(err);
      })
      .run();
  });
}
