import type { NextApiRequest, NextApiResponse } from "next";
import fs from "node:fs/promises";
import path from "node:path";
import React from "react";
import type { SatoriOptions } from "satori";
import { z } from "zod";

import { Meeting, App, Generic } from "@calcom/lib/OgImages";

const calFont = fs.readFile(path.join(process.cwd(), "apps/web/public/fonts/cal.ttf"));
const interFont = fs.readFile(path.join(process.cwd(), "apps/web/public/fonts/Inter-Regular.ttf"));
const interFontMedium = fs.readFile(path.join(process.cwd(), "apps/web/public/fonts/Inter-Medium.ttf"));

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
  const searchParams = req.query;
  const imageType = searchParams["type"];

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
          names: searchParams["names"],
          usernames: searchParams["usernames"],
          title: searchParams["title"],
          meetingProfileName: searchParams["meetingProfileName"],
          meetingImage: searchParams["meetingImage"],
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
          name: searchParams["name"],
          description: searchParams["description"],
          slug: searchParams["slug"],
          imageType,
        });

        img = new ImageResponse(<App name={name} description={description} slug={slug} />, ogConfig);
        break;
      }
      case "generic": {
        const { title, description } = genericSchema.parse({
          title: searchParams["title"],
          description: searchParams["description"],
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
