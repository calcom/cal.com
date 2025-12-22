import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key) {
    return new NextResponse("Missing key", { status: 400 });
  }

  // 1. Path Validation: Ensure the key is within the attachments directory
  const deploymentEnv = process.env.AWS_S3_ATTACHMENTS_ENV;
  if (!deploymentEnv || !key.startsWith(`${deploymentEnv}/`)) {
    console.error(`[Attachments] Invalid key prefix: ${key}`);
    return new NextResponse("Forbidden", { status: 403 });
  }

  const session = await getServerSession({
    req: buildLegacyRequest(await headers(), await cookies()),
  });

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 2. Authorization Check
  const filename = key.split("/").pop();

  // Check if user is Host, Attendee, or an Admin/Owner of the calIdTeam the booking belongs to
  const bookings = (await prisma.$queryRaw`
    SELECT b.id FROM "Booking" b
    LEFT JOIN "EventType" et ON b."eventTypeId" = et.id
    WHERE (
      -- Is the Host
      b."userId" = ${session.user.id} 
      OR 
      -- Is an Attendee
      EXISTS (
        SELECT 1 FROM "Attendee" a 
        WHERE b.id = a."bookingId" 
        AND a.email = ${session.user.email}
      )
      OR
      -- Is a CalIdTeam Admin/Owner
      EXISTS (
        SELECT 1 FROM "CalIdMembership" cm
        WHERE cm."calIdTeamId" = et."calIdTeamId"
        AND cm."userId" = ${session.user.id}
        AND cm.role IN ('ADMIN', 'OWNER')
      )
    )
    AND (b.responses::text LIKE ${`%${key}%`} OR b.responses::text LIKE ${`%${filename}%`})
    LIMIT 1
  `) as { id: number }[];

  if (!bookings || bookings.length === 0) {
    console.warn(`[Attachments] Access denied: User ${session.user.id} tried to access ${key}`);
    return new NextResponse("Forbidden", { status: 403 });
  }

  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_S3_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    return new NextResponse("S3 configuration is missing", { status: 500 });
  }

  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  try {
    const data = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = data.Body as any;
    const stream = body?.transformToWebStream?.() || body;

    return new Response(stream as ReadableStream, {
      headers: {
        "Content-Type": data.ContentType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": data.ContentLength?.toString() || "",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Failed to fetch attachment from S3:", error);
    return new NextResponse("Failed to fetch attachment", { status: 500 });
  }
}
