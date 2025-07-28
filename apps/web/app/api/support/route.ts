import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { IS_PLAIN_CHAT_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { plain, upsertPlainCustomer } from "@lib/plain/plain";

const contactFormSchema = z.object({
  message: z.string().min(1, "Message is required"),
  attachmentIds: z.array(z.string()).optional(),
});

const log = logger.getSubLogger({ prefix: [`/api/support`] });

export async function POST(req: Request) {
  if (!IS_PLAIN_CHAT_ENABLED) {
    return NextResponse.json({ error: "Plain Chat is not enabled" }, { status: 404 });
  }

  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized - No session found" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { message, attachmentIds } = contactFormSchema.parse(body);

    const plainApiKey = process.env.PLAIN_API_KEY;
    if (!plainApiKey) {
      return NextResponse.json({ error: "Plain API key not configured" }, { status: 500 });
    }

    let plainCustomerId: string | null = null;

    const plainCustomer = await plain.getCustomerByEmail({ email: session.user.email });

    if (plainCustomer.data) {
      plainCustomerId = plainCustomer.data.id;
    } else {
      const { data, error } = await upsertPlainCustomer({
        email: session.user.email,
        id: session.user.id,
        name: session.user.name,
      });

      if (error) {
        log.error(`Error submitting plain contact form: `, safeStringify(error));
        return NextResponse.json(
          {
            message: error.message,
          },
          { status: 500 }
        );
      }

      if (data) {
        plainCustomerId = data.customer.id;
      }
    }

    if (!plainCustomerId) {
      return NextResponse.json({ message: "Plain customer not found" }, { status: 404 });
    }

    const { data, error } = await plain.createThread({
      customerIdentifier: {
        customerId: plainCustomerId,
      },
      components: [
        {
          componentText: {
            text: message,
          },
        },
      ],
      attachmentIds,
    });

    if (error) {
      log.error("Error creating plain contact form thread: ", safeStringify(error));
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    log.error(`Error submitting plain contact form: `, safeStringify(err));
    return NextResponse.json({ message: "Unexpected error occured" }, { status: 500 });
  }
}
