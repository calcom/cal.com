import type { NextApiRequest, NextApiResponse } from "next";

import { CAL_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import type {
  NewCanvas,
  ListComponent,
  ListItem,
  SpacerComponent,
  TextComponent,
  InputComponent,
} from "../lib";
import { isValidCalURL } from "../lib/isValidCalURL";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { admin, input_values, component_id } = req.body;

  let isValid: boolean | TextComponent = true;
  if (component_id || input_values?.submit_booking_url) {
    const url = component_id || input_values?.submit_booking_url;
    isValid = await isValidCalURL(url);

    if (isValid) return res.status(200).json({ results: { submit_booking_url: url } });
  }

  const input: InputComponent = {
    type: "input",
    id: "submit_booking_url",
    label: "Enter your Cal.com link",
    placeholder: "https://cal.com/valentinchmara/30min",
    save_state: "unsaved",
    action: {
      type: "submit",
    },
    aria_label: "Enter your Cal.com link",
  };

  const defaultCanvasData: NewCanvas = {
    canvas: {
      content: {
        components: isValid === true ? [input] : [isValid, input],
      },
    },
  };

  if (!admin?.id) return res.status(200).json(defaultCanvasData);

  const credential = await prisma.credential.findFirst({
    where: {
      appId: "intercom",
      key: {
        string_contains: admin.id,
      },
    },
  });

  if (!credential) return res.status(200).json(defaultCanvasData);

  const team = credential.teamId
    ? await prisma.team.findUnique({
        where: {
          id: credential.teamId,
        },
      })
    : null;

  const userId = credential.userId;

  const user = userId
    ? await prisma.user.findUnique({
        where: {
          id: userId,
        },
      })
    : null;

  const eventTypes = await prisma.eventType.findMany({
    where: {
      userId,
      hidden: false,
    },
  });

  if (!eventTypes) return res.status(200).json(defaultCanvasData);
  if (!user && !team) return res.status(200).json(defaultCanvasData);

  const list: ListItem[] = eventTypes.map((eventType) => {
    let slug;
    if (team && team.slug) {
      slug = `team/${team.slug}`;
    } else if (user && user.username) {
      slug = user.username;
    }

    return {
      id: `${CAL_URL}/${slug}/${eventType.slug}`,
      type: "item",
      title: eventType.title,
      subtitle: `${slug}/${eventType.slug}`,
      rounded_image: false,
      disabled: false,
      action: {
        type: "submit",
      },
    };
  });

  const components: ListComponent = {
    type: "list",
    items: list,
  };

  const spacer: SpacerComponent = {
    type: "spacer",
    size: "m",
  };

  const text: TextComponent = {
    type: "text",
    text: "Or choose another Cal.com link:",
    style: "muted",
    align: "left",
  };

  const canvasData: NewCanvas = {
    canvas: {
      content: {
        components:
          isValid === true ? [components, spacer, text, input] : [isValid, components, spacer, text, input],
      },
    },
  };

  return res.status(200).json(canvasData);
}
