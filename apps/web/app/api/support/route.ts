import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { IS_PLAIN_CHAT_ENABLED } from "@calcom/lib/constants";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const attachmentSchema = z.object({
  file: z.object({
    name: z.string(),
    size: z.number(),
    type: z.string(),
  }),
  dataUrl: z.string(),
  id: z.string(),
});

const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
  attachments: z.array(attachmentSchema).optional().default([]),
});

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
    const validatedData = contactFormSchema.parse(body);

    const plainApiKey = process.env.PLAIN_API_KEY;
    if (!plainApiKey) {
      return NextResponse.json({ error: "Plain API key not configured" }, { status: 500 });
    }

    const createCustomerMutation = `
      mutation UpsertCustomer($customer: UpsertCustomerInput!) {
        upsertCustomer(customer: $customer) {
          customer {
            id
            email {
              email
            }
            fullName
          }
          error {
            message
            type
          }
        }
      }
    `;

    const createAttachmentUploadUrlMutation = `
      mutation CreateAttachmentUploadUrl($input: CreateAttachmentUploadUrlInput!) {
        createAttachmentUploadUrl(input: $input) {
          attachmentUploadUrl {
            uploadUrl
            uploadFormData {
              key
              value
            }
            attachment {
              id
            }
          }
          error {
            message
            type
          }
        }
      }
    `;

    const createThreadMutation = `
      mutation CreateThread($input: CreateThreadInput!) {
        createThread(input: $input) {
          thread {
            id
          }
          error {
            message
            type
          }
        }
      }
    `;

    const customerResponse = await fetch("https://core-api.uk.plain.com/graphql/v1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${plainApiKey}`,
      },
      body: JSON.stringify({
        query: createCustomerMutation,
        variables: {
          customer: {
            identifier: {
              emailAddress: validatedData.email,
            },
            onCreate: {
              fullName: validatedData.name,
              email: {
                email: validatedData.email,
                isVerified: false,
              },
            },
            onUpdate: {
              fullName: {
                value: validatedData.name,
              },
            },
          },
        },
      }),
    });

    const customerData = await customerResponse.json();

    if (customerData.errors || customerData.data?.upsertCustomer?.error) {
      console.error("Plain customer creation error:", customerData);
      return NextResponse.json({ error: "Failed to create customer in Plain" }, { status: 500 });
    }

    const customerId = customerData.data.upsertCustomer.customer.id;

    const attachmentIds: string[] = [];

    if (validatedData.attachments && validatedData.attachments.length > 0) {
      for (const attachment of validatedData.attachments) {
        try {
          const uploadUrlResponse = await fetch("https://core-api.uk.plain.com/graphql/v1", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${plainApiKey}`,
            },
            body: JSON.stringify({
              query: createAttachmentUploadUrlMutation,
              variables: {
                input: {
                  customerId,
                  fileName: attachment.file.name,
                  fileSizeBytes: attachment.file.size,
                  attachmentType: "CUSTOMER_TIMELINE_ENTRY",
                },
              },
            }),
          });

          const uploadUrlData = await uploadUrlResponse.json();

          if (uploadUrlData.errors || uploadUrlData.data?.createAttachmentUploadUrl?.error) {
            console.error("Plain attachment upload URL creation error:", uploadUrlData);
            continue;
          }

          const {
            uploadUrl,
            uploadFormData,
            attachment: attachmentInfo,
          } = uploadUrlData.data.createAttachmentUploadUrl.attachmentUploadUrl;

          const base64Data = attachment.dataUrl.split(",")[1];
          const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
          const blob = new Blob([binaryData], { type: attachment.file.type });

          const formData = new FormData();
          uploadFormData.forEach((field: { key: string; value: string }) => {
            formData.append(field.key, field.value);
          });
          formData.append("file", blob, attachment.file.name);

          const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            body: formData,
          });

          if (uploadResponse.ok) {
            attachmentIds.push(attachmentInfo.id);
          } else {
            console.error("Failed to upload attachment to S3:", uploadResponse.statusText);
          }
        } catch (error) {
          console.error("Error processing attachment:", error);
        }
      }
    }

    const threadResponse = await fetch("https://core-api.uk.plain.com/graphql/v1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${plainApiKey}`,
      },
      body: JSON.stringify({
        query: createThreadMutation,
        variables: {
          input: {
            customerId,
            title: validatedData.subject,
            components: [
              {
                componentText: {
                  text: validatedData.message,
                },
              },
              ...attachmentIds.map((attachmentId) => ({
                componentAttachment: {
                  attachmentId,
                },
              })),
            ],
            labelTypeIds: ["lt_01JFJWNWAC464N8DZ6YE71YJRF"],
          },
        },
      }),
    });

    const threadData = await threadResponse.json();

    if (threadData.errors || threadData.data?.createThread?.error) {
      console.error("Plain thread creation error:", threadData);
      return NextResponse.json({ error: "Failed to create support thread" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form submission error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid form data", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
