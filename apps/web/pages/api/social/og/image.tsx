import { ImageResponse } from "@vercel/og";
import { NextApiRequest } from "next";
import { z } from "zod";

import { Meeting, App } from "../../../../components/seo/og-images";

const calFont = fetch(new URL("../../../../public/fonts/cal.ttf", import.meta.url)).then((res) =>
  res.arrayBuffer()
);

export const config = {
  runtime: "experimental-edge",
};

const meetingSchema = z.object({
  imageType: z.literal("meeting"),
  name: z.string(),
  title: z.string(),
  users: z.string().array(),
});

const appSchema = z.object({
  imageType: z.literal("app"),
  name: z.string(),
  description: z.string(),
  slug: z.string(),
});

export default async function handler(req: NextApiRequest) {
  const { searchParams } = new URL(`${req.url}`);
  const imageType = searchParams.get("type");

  const calFontData = await calFont;
  const ogConfig = {
    fonts: [{ name: "cal", data: calFontData }],
  };

  switch (imageType) {
    case "meeting": {
      const { name, users, title } = meetingSchema.parse({
        name: searchParams.get("name"),
        users: searchParams.getAll("users"),
        title: searchParams.get("title"),
        imageType,
      });
      return new ImageResponse(<Meeting name={name} title={title} users={users} />, ogConfig);
    }
    case "app": {
      const { name, description, slug } = appSchema.parse({
        name: searchParams.get("name"),
        description: searchParams.get("description"),
        slug: searchParams.get("slug"),
        imageType,
      });
      return new ImageResponse(<App name={name} description={description} slug={slug} />, ogConfig);
    }
    default:
      return new Response("What you're looking for is not here..", { status: 404 });
  }
}
