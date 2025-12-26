import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import dayjs from "@calcom/dayjs";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { WEBAPP_URL } from "@calcom/lib/constants";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const MAX_BYTES = 1 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession({
      req: buildLegacyRequest(await headers(), await cookies()),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of ${MAX_BYTES / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_S3_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const deploymentEnv = process.env.AWS_S3_ATTACHMENTS_ENV;

    if (!bucket || !region || !accessKeyId || !secretAccessKey || !deploymentEnv) {
      return NextResponse.json({ error: "S3 configuration is missing" }, { status: 500 });
    }

    const client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const now = dayjs();
    const year = now.format("YYYY");
    const month = now.format("MM");
    const date = now.format("DD");
    const fileName = `${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
    const key = `${deploymentEnv}/${year}/${month}/${date}/attachments/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      })
    );

    const url = `${WEBAPP_URL}/api/bookings/attachments?key=${encodeURIComponent(key)}`;

    return NextResponse.json({
      url,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("Failed to upload attachment:", error);
    return NextResponse.json({ error: "Failed to upload attachment" }, { status: 500 });
  }
}
