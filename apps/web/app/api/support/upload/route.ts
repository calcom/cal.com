import { AttachmentType } from "@team-plain/typescript-sdk";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { IS_PLAIN_CHAT_ENABLED } from "@calcom/lib/constants";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { plain, upsertPlainCustomer } from "@lib/plain/plain";

export async function GET(req: NextRequest) {
  if (!IS_PLAIN_CHAT_ENABLED) {
    return NextResponse.json({ error: "Plain Chat is not enabled" }, { status: 404 });
  }

  const searchParams = req.nextUrl.searchParams;
  const name = searchParams.get("name");
  const size = searchParams.get("size");

  if (!name || !size) {
    return NextResponse.json({ error: "Missing required parameters: name and size" }, { status: 400 });
  }

  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized - No session found" }, { status: 401 });
  }

  let plainCustomerId: string | null = null;

  const plainCustomer = await plain.getCustomerByEmail({
    email: session.user.email,
  });

  console.log("plainCustomer: ", plainCustomer);

  if (plainCustomer.data) {
    plainCustomerId = plainCustomer.data.id;
  } else {
    const { data, error } = await upsertPlainCustomer({
      name: session.user.name,
      email: session.user.email,
      id: session.user.id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data) {
      plainCustomerId = data.customer.id;
    }
  }

  if (!plainCustomerId) {
    return NextResponse.json({ error: "Plain customer not found" }, { status: 500 });
  }

  const { data, error } = await plain.createAttachmentUploadUrl({
    customerId: plainCustomerId,
    fileName: name,
    fileSizeBytes: parseInt(size),
    attachmentType: AttachmentType.CustomTimelineEntry,
  });

  if (error) {
    return NextResponse.json({
      error: error.message,
    });
  }

  return NextResponse.json(data);
}
