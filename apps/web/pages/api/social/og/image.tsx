import { ImageResponse } from "@vercel/og";
import type { NextApiRequest } from "next";
import type { SatoriOptions } from "satori";
import { z } from "zod";

import { Meeting, App, Generic } from "@calcom/lib/OgImages";

const calFont = fetch(new URL("../../../../public/fonts/cal.ttf", import.meta.url)).then((res) =>
  res.arrayBuffer()
);

const interFont = fetch(new URL("../../../../public/fonts/Inter-Regular.ttf", import.meta.url)).then((res) =>
  res.arrayBuffer()
);

const interFontMedium = fetch(new URL("../../../../public/fonts/Inter-Medium.ttf", import.meta.url)).then(
  (res) => res.arrayBuffer()
);

export const config = {
  runtime: "edge",
};

const ZLocale = z.union([z.string(), z.null(), z.undefined()]).transform((val) => val ?? "en");

const meetingSchema = z.object({
  imageType: z.literal("meeting"),
  title: z.string(),
  names: z.string().array(),
  usernames: z.string().array(),
  meetingProfileName: z.string(),
  meetingImage: z.string().nullable().optional(),
  locale: ZLocale,
});

const appSchema = z.object({
  imageType: z.literal("app"),
  name: z.string(),
  description: z.string(),
  slug: z.string(),
  locale: ZLocale,
});

const genericSchema = z.object({
  imageType: z.literal("generic"),
  title: z.string(),
  description: z.string(),
  locale: ZLocale,
});

async function getTranslation({ locale, params }: { locale: string; params: string[] }) {
  const defaultFn = (value: string) => value;
  const allLowerCaseNumbersAndUnderscores = /^[a-z0-9_]+$/;
  const requiresTranslation = params.some((arg) => allLowerCaseNumbersAndUnderscores.test(arg));
  if (!requiresTranslation) return { t: defaultFn };

  try {
    const translation = await fetch(`https://cal.com/static/locales/${locale}/common.json`, {});
    const json = await translation.json();
    const t = (value: string): string => json[value] ?? value;
    return { t };
  } catch (err) {
    console.error(err);
    return { t: defaultFn };
  }
}

export default async function handler(req: NextApiRequest) {
  const { searchParams } = new URL(`${req.url}`);
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

  switch (imageType) {
    case "meeting": {
      const { names, usernames, title, meetingProfileName, meetingImage, locale } = meetingSchema.parse({
        names: searchParams.getAll("names"),
        usernames: searchParams.getAll("usernames"),
        title: searchParams.get("title"),
        meetingProfileName: searchParams.get("meetingProfileName"),
        meetingImage: searchParams.get("meetingImage"),
        locale: searchParams.get("locale"),
        imageType,
      });

      const { t } = await getTranslation({ locale, params: [title] });

      const img = new ImageResponse(
        (
          <Meeting
            title={t(title)}
            profile={{ name: meetingProfileName, image: meetingImage }}
            users={names.map((name, index) => ({ name, username: usernames[index] }))}
          />
        ),
        ogConfig
      ) as { body: Buffer };

      return new Response(img.body, { status: 200, headers: { "Content-Type": "image/png" } });
    }
    case "app": {
      const { name, description, slug, locale } = appSchema.parse({
        name: searchParams.get("name"),
        description: searchParams.get("description"),
        slug: searchParams.get("slug"),
        locale: searchParams.get("locale"),
        imageType,
      });
      const { t } = await getTranslation({ locale, params: [description] });
      const img = new ImageResponse(
        <App name={name} description={t(description)} slug={slug} />,
        ogConfig
      ) as {
        body: Buffer;
      };

      return new Response(img.body, { status: 200, headers: { "Content-Type": "image/png" } });
    }

    case "generic": {
      const { title, description, locale } = genericSchema.parse({
        title: searchParams.get("title"),
        description: searchParams.get("description"),
        locale: searchParams.get("locale"),
        imageType,
      });
      console.log("locale", locale);
      const { t } = await getTranslation({ locale, params: [title, description] });

      const img = new ImageResponse(<Generic title={t(title)} description={t(description)} />, ogConfig) as {
        body: Buffer;
      };

      return new Response(img.body, { status: 200, headers: { "Content-Type": "image/png" } });
    }

    default:
      return new Response("What you're looking for is not here..", { status: 404 });
  }
}
