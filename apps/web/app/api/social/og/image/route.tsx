import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import type { SatoriOptions } from "satori";
import { z, ZodError } from "zod";

import { Meeting, App, Generic } from "@calcom/lib/OgImages";
import { WEBAPP_URL } from "@calcom/lib/constants";

// Cache configuration for Vercel/Next.js
export const revalidate = 0; // Cache indefinitely, invalidate manually

const meetingSchema = z.object({
  imageType: z.literal("meeting"),
  title: z.string(),
  names: z.string().array(),
  usernames: z.string().array(),
  meetingProfileName: z.string(),
  meetingImage: z.string().nullable().optional(),
  eventTypeId: z.string(),
});

const appSchema = z.object({
  imageType: z.literal("app"),
  name: z.string(),
  description: z.string(),
  slug: z.string(),
});

const genericSchema = z.object({
  imageType: z.literal("generic"),
  title: z.string(),
  description: z.string(),
});

async function handler(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const imageType = searchParams.get("type") || "unknown";

  try {
    const fontResults = await Promise.allSettled([
      fetch(new URL("/fonts/cal.ttf", WEBAPP_URL)).then((res) => res.arrayBuffer()),
      fetch(new URL("/fonts/Inter-Regular.ttf", WEBAPP_URL)).then((res) => res.arrayBuffer()),
      fetch(new URL("/fonts/Inter-Medium.ttf", WEBAPP_URL)).then((res) => res.arrayBuffer()),
    ]);

    const fonts: SatoriOptions["fonts"] = [];

    if (fontResults[1].status === "fulfilled") {
      fonts.push({ name: "inter", data: fontResults[1].value, weight: 400 });
    }

    if (fontResults[2].status === "fulfilled") {
      fonts.push({ name: "inter", data: fontResults[2].value, weight: 500 });
    }

    if (fontResults[0].status === "fulfilled") {
      fonts.push({ name: "cal", data: fontResults[0].value, weight: 400 });
      fonts.push({ name: "cal", data: fontResults[0].value, weight: 600 });
    }

    const ogConfig = {
      width: 1200,
      height: 630,
      fonts,
    };

    // Generate cache tag only for meeting type, using eventTypeId
    const generateCacheTag = (type: string, params: URLSearchParams) => {
      const eventTypeId = params.get("eventTypeId");
      if (type === "meeting" && eventTypeId) {
        return `og-image:meeting:${eventTypeId}`;
      }
      return null;
    };

    const cacheTag = generateCacheTag(imageType, searchParams);
    const cacheHeaders = {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      ...(cacheTag ? { "x-cache-tag": cacheTag } : {}),
    } as const;

    switch (imageType) {
      case "meeting": {
        try {
          const { names, usernames, title, meetingProfileName, meetingImage, eventTypeId } =
            meetingSchema.parse({
              names: searchParams.getAll("names"),
              usernames: searchParams.getAll("usernames"),
              title: searchParams.get("title"),
              meetingProfileName: searchParams.get("meetingProfileName"),
              meetingImage: searchParams.get("meetingImage"),
              eventTypeId: searchParams.get("eventTypeId"),
              imageType,
            });

          const img = new ImageResponse(
            (
              <Meeting
                title={title}
                profile={{ name: meetingProfileName, image: meetingImage }}
                users={names.map((name, index) => ({ name, username: usernames[index] }))}
              />
            ),
            ogConfig
          );

          return new Response(img.body, {
            status: 200,
            headers: cacheHeaders,
          });
        } catch (error) {
          if (error instanceof ZodError) {
            return new Response(
              JSON.stringify({
                error: "Invalid parameters for meeting image",
                message:
                  "Required parameters: title, meetingProfileName, eventTypeId. Optional: names, usernames, meetingImage",
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }
          throw error;
        }
      }
      case "app": {
        try {
          const { name, description, slug } = appSchema.parse({
            name: searchParams.get("name"),
            description: searchParams.get("description"),
            slug: searchParams.get("slug"),
            imageType,
          });
          const img = new ImageResponse(<App name={name} description={description} slug={slug} />, ogConfig);

          return new Response(img.body, {
            status: 200,
            headers: cacheHeaders,
          });
        } catch (error) {
          if (error instanceof ZodError) {
            return new Response(
              JSON.stringify({
                error: "Invalid parameters for app image",
                message: "Required parameters: name, description, slug",
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }
          throw error;
        }
      }

      case "generic": {
        try {
          const { title, description } = genericSchema.parse({
            title: searchParams.get("title"),
            description: searchParams.get("description"),
            imageType,
          });

          const img = new ImageResponse(<Generic title={title} description={description} />, ogConfig);

          return new Response(img.body, {
            status: 200,
            headers: cacheHeaders,
          });
        } catch (error) {
          if (error instanceof ZodError) {
            return new Response(
              JSON.stringify({
                error: "Invalid parameters for generic image",
                message: "Required parameters: title, description",
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }
          throw error;
        }
      }

      default:
        return new Response("What you're looking for is not here..", { status: 404 });
    }
  } catch (error) {
    return new Response("Internal server error", { status: 500 });
  }
}

export { handler as GET };
