import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { Contact } from "@calcom/features/ee/support/lib/intercom/intercom";
import { intercom } from "@calcom/features/ee/support/lib/intercom/intercom";
import { WEBAPP_URL, WEBSITE_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const log = logger.getSubLogger({ prefix: [`/api/support/conversation`] });

export async function POST(req: NextRequest) {
  const headersList = await headers();
  const cookiesList = await cookies();
  const legacyReq = buildLegacyRequest(headersList, cookiesList);

  const session = await getServerSession({ req: legacyReq });
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized - No session found" }, { status: 401 });
  }

  const intercomApiKey = process.env.INTERCOM_API_TOKEN;
  if (!intercomApiKey) {
    return NextResponse.json({ error: "Intercom API key not configured" }, { status: 500 });
  }

  let contact: Contact;

  const existingContact = await intercom.getContactByEmail(session.user.email);

  if (existingContact.error) {
    return NextResponse.json({ error: existingContact?.error ?? "Error fetching intercom contact for user" });
  }

  const { user } = session;

  if (!existingContact.data) {
    const newContact = await intercom.createContact({
      email: session.user.email,
      external_id: session.user.id.toString(),
      name: session.user.name ?? session.user.email,
      type: "contact",
      custom_attributes: {
        user_name: user?.username,
        link: `${WEBSITE_URL}/${user?.username}`,
        admin_link: `${WEBAPP_URL}/settings/admin/users/${user?.id}/edit`,
        impersonate_user: `${WEBAPP_URL}/settings/admin/impersonation?username=${
          user?.email ?? user?.username
        }`,
        locale: user?.locale,
        completed_onboarding: user?.completedOnboarding,
        is_logged_in: !!user,
        has_orgs_plan: !!user?.org,
        organization: user?.org?.slug,
      },
    });

    if (newContact.error || !newContact.data) {
      return NextResponse.json({ error: newContact.error ?? "Error creating contact from email" });
    }

    contact = newContact.data;
  } else {
    contact = existingContact.data;
  }

  if (!contact) {
    return NextResponse.json({ error: "No contactId found" }, { status: 404 });
  }

  try {
    const { message } = await req.json();

    if (!message.trim()) {
      return NextResponse.json({ error: "Cannot start a conversation without message" });
    }

    const conversation = await intercom.createConversation({
      body: message,
      from: {
        id: contact.id,
        type: "user",
      },
    });

    if (conversation.error) {
      return NextResponse.json(
        { error: conversation.error ?? "Error creating conversation" },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Created conversation in Intercom" }, { status: 200 });
  } catch (err) {
    console.error(err);
    log.error(`Error creating Intercom conversation:`, safeStringify(err));
    return NextResponse.json({ error: "Unexpected error occurred" }, { status: 500 });
  }
}
