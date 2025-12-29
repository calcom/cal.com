import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import prisma from "@calcom/prisma";

export async function DELETE(req: NextRequest) {
  try {
    // Public endpoint - but only allow deletion if file is not used in any booking
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
    }

    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_S3_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const deploymentEnv = process.env.AWS_S3_ATTACHMENTS_ENV;

    if (!bucket || !region || !accessKeyId || !secretAccessKey || !deploymentEnv) {
      return NextResponse.json({ error: "S3 configuration is missing" }, { status: 500 });
    }

    // Validate that the key belongs to the deployment environment
    if (!key.startsWith(`${deploymentEnv}/`)) {
      return NextResponse.json({ error: "Invalid key" }, { status: 403 });
    }

    // Security: Check if file is used in any booking - if so, don't allow deletion
    const filename = key.split("/").pop();
    const bookings = (await prisma.$queryRaw`
      SELECT b.id FROM "Booking" b
      WHERE (b.responses::text LIKE ${`%${key}%`} OR b.responses::text LIKE ${`%${filename}%`})
      LIMIT 1
    `) as { id: number }[];

    if (bookings && bookings.length > 0) {
      return NextResponse.json(
        { error: "File is associated with a booking and cannot be deleted" },
        { status: 403 }
      );
    }

    const client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete attachment from S3:", error);
    return NextResponse.json({ error: "Failed to delete attachment" }, { status: 500 });
  }
}
