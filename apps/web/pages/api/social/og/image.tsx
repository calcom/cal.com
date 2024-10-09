import type { NextApiRequest, NextApiResponse } from "next";
import fs from "node:fs/promises";
import path from "path";
import type { SatoriOptions } from "satori";
import { z } from "zod";

import { Meeting, App, Generic } from "@calcom/lib/OgImages";

const calFont = fs.readFile(path.join(process.cwd(), "public/fonts/cal.ttf"));
const interFont = fs.readFile(path.join(process.cwd(), "public/fonts/Inter-Regular.ttf"));
const interFontMedium = fs.readFile(path.join(process.cwd(), "public/fonts/Inter-Medium.ttf"));

export const config = {
  runtime: "nodejs",
};

const meetingSchema = z.object({
  imageType: z.literal("meeting"),
  title: z.string(),
  names: z.string().array(),
  usernames: z.string().array(),
  meetingProfileName: z.string(),
  meetingImage: z.string().nullable().optional(),
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const host = req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const { searchParams } = new URL(`${protocol}://${host}${req.url}`);
  const imageType = searchParams.get("type");

  const [calFontData, interFontData, interFontMediumData] = await Promise.all([
    calFont,
    interFont,
    interFontMedium,
  ]);
  const ogConfig = {
    width: 1200,
    height: 630,
    fonts: [
      { name: "inter", data: interFontData, weight: 400 },
      { name: "inter", data: interFontMediumData, weight: 500 },
      { name: "cal", data: calFontData, weight: 400 },
      { name: "cal", data: calFontData, weight: 600 },
    ] as SatoriOptions["fonts"],
  };

  const { ImageResponse } = await import("@vercel/og");

  try {
    let img;
    switch (imageType) {
      case "meeting": {
        const { names, usernames, title, meetingProfileName, meetingImage } = meetingSchema.parse({
          names: searchParams.getAll("names"),
          usernames: searchParams.getAll("usernames"),
          title: searchParams.get("title"),
          meetingProfileName: searchParams.get("meetingProfileName"),
          meetingImage: searchParams.get("meetingImage"),
          imageType,
        });

        img = new ImageResponse(
          (
            <Meeting
              title={title}
              profile={{ name: meetingProfileName, image: meetingImage }}
              users={names.map((name, index) => ({ name, username: usernames[index] }))}
            />
          ),
          ogConfig
        );
        break;
      }
      case "app": {
        const { name, description, slug } = appSchema.parse({
          name: searchParams.get("name"),
          description: searchParams.get("description"),
          slug: searchParams.get("slug"),
          imageType,
        });

        img = new ImageResponse(<App name={name} description={description} slug={slug} />, ogConfig);
        break;
      }
      case "generic": {
        const { title, description } = genericSchema.parse({
          title: searchParams.get("title"),
          description: searchParams.get("description"),
          imageType,
        });

        img = new ImageResponse(<Generic title={title} description={description} />, ogConfig);
        break;
      }
      default:
        res.status(404).send("What you're looking for is not here..");
        return;
    }

    res.setHeader("Content-Type", "image/png");
    res.status(200).send(img.body);
  } catch (error) {
    console.error("Error generating image:", error);
    res.status(500).send("Error generating image");
  }
}
