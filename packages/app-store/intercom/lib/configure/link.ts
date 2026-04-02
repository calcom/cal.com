import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import type { NextApiRequest } from "next";
import type {
  InputComponent,
  ListComponent,
  ListItem,
  NewCanvas,
  SpacerComponent,
  TextComponent,
} from "../../lib";
import { isValidCalURL } from "../../lib/isValidCalURL";

export async function handleLinkStep(req: NextApiRequest): Promise<NewCanvas | string> {
  const { admin, component_id, input_values } = req.body;

  const url = component_id === "submit_booking_url" ? input_values?.submit_booking_url : component_id;
  const { isValid, error } = url ? await isValidCalURL(url) : { isValid: false, error: undefined };

  if (isValid) return url;

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
        components: !error ? [input] : [error, input],
      },
    },
  };

  if (!admin?.id) return defaultCanvasData;

  const credential = await prisma.credential.findFirst({
    where: {
      appId: "intercom",
      key: {
        string_contains: admin.id,
      },
    },
  });

  if (!credential) return defaultCanvasData;

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
      teamId: team ? team.id : undefined,
    },
  });

  if (eventTypes && eventTypes?.length === 0) return defaultCanvasData;
  if (!user && !team) return defaultCanvasData;

  // Limit to 10 Events types
  const list: ListItem[] = eventTypes.slice(0, 10).map((eventType) => {
    let slug;
    if (team && team.slug) {
      slug = `team/${team.slug}`;
    } else if (user && user.username) {
      slug = user.username;
    }

    return {
      id: `${WEBAPP_URL}/${slug}/${eventType.slug}`,
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
        components: !error ? [components, spacer, text, input] : [components, spacer, text, input, error],
      },
    },
  };

  return canvasData;
}
