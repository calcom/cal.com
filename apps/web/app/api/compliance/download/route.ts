import B2 from "backblaze-b2";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { COMPLIANCE_DOCUMENTS } from "~/settings/security/compliance/compliance-documents";

const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID || "",
  applicationKey: process.env.B2_APPLICATION_KEY || "",
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("id");

  if (!documentId) {
    return NextResponse.json({ error: "Missing document ID" }, { status: 400 });
  }

  // Find the document in our config
  const document = COMPLIANCE_DOCUMENTS.find((doc) => doc.id === documentId);
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Only handle B2 documents through this route
  if (document.source.type !== "b2") {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }

  // Check authentication
  const legacyReq = buildLegacyRequest(await headers(), await cookies());
  const session = await getServerSession({ req: legacyReq });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if document is restricted and user has access
  if (document.restricted) {
    const hasOrgAccess = !!session.user?.org?.id;
    if (!hasOrgAccess) {
      return NextResponse.json({ error: "Upgrade required to access this document" }, { status: 403 });
    }
  }

  try {
    // Authorize with B2 - this returns the downloadUrl
    const { data: authResponse } = await b2.authorize();

    const bucketName = process.env.B2_BUCKET_NAME || "";
    const fileName = document.source.fileName;

    // Get download authorization token for this specific file
    const { data: downloadAuth } = await b2.getDownloadAuthorization({
      bucketId: process.env.B2_BUCKET_ID || "",
      fileNamePrefix: fileName,
      validDurationInSeconds: 3600, // 1 hour
    });

    // Construct the download URL using downloadUrl from authorize() and token from getDownloadAuthorization()
    const downloadUrl = `${authResponse.downloadUrl}/file/${bucketName}/${fileName}?Authorization=${downloadAuth.authorizationToken}`;

    // Redirect to the authorized download URL
    return NextResponse.redirect(downloadUrl, { status: 302 });
  } catch (error) {
    console.error("Failed to get B2 download URL:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Failed to generate download link" }, { status: 500 });
  }
}
