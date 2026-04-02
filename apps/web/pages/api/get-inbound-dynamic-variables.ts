import dayjs from "@calcom/dayjs";
import type { TGetRetellLLMSchema } from "@calcom/features/calAIPhone/zod-utils";
import { ZGetRetellLLMSchema } from "@calcom/features/calAIPhone/zod-utils";
import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";
import { fetcher } from "@calcom/lib/retellAIFetcher";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import prisma from "@calcom/prisma";
import advancedFormat from "dayjs/plugin/advancedFormat";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

dayjs.extend(advancedFormat);

const schema = z.object({
  llm_id: z.string(),
  from_number: z.string(),
  to_number: z.string(),
});

const getEventTypeIdFromRetellLLM = (
  retellLLM: TGetRetellLLMSchema
): { eventTypeId: number | undefined; timezone: string | undefined } => {
  const { general_tools, states } = retellLLM;

  const generalTool = general_tools.find((tool) => tool.event_type_id && tool.timezone);

  if (generalTool) {
    return { eventTypeId: generalTool.event_type_id, timezone: generalTool.timezone };
  }

  // If no general tool found, search in states
  if (states) {
    for (const state of states) {
      const tool = state.tools.find((tool) => tool.event_type_id && tool.timezone);
      if (tool) {
        return { eventTypeId: tool.event_type_id, timezone: tool.timezone };
      }
    }
  }

  return { eventTypeId: undefined, timezone: undefined };
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const response = schema.safeParse(req.body);

  if (!response.success) {
    return res.status(400).send({
      message: "Invalid Payload",
    });
  }

  const body = response.data;

  const retellLLM = await fetcher(`/get-retell-llm/${body.llm_id}`).then(ZGetRetellLLMSchema.parse);

  const { eventTypeId, timezone } = getEventTypeIdFromRetellLLM(retellLLM);

  if (!eventTypeId || !timezone)
    return res.status(404).json({ message: "eventTypeId or Timezone not found" });

  const eventType = await prisma.eventType.findUnique({
    where: {
      id: eventTypeId,
    },
    select: {
      id: true,
      teamId: true,
      team: {
        select: {
          parent: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!eventType) return res.status(404).json({ message: "eventType not found id" });

  const now = dayjs();

  const startTime = now.startOf("month").toISOString();
  const endTime = now.add(2, "month").endOf("month").toISOString();
  const orgSlug = eventType?.team?.parent?.slug ?? null;
  const availableSlotsService = getAvailableSlotsService();

  const availableSlots = await availableSlotsService.getAvailableSlots({
    input: {
      startTime,
      endTime,
      eventTypeId,
      isTeamEvent: !!eventType?.teamId,
      orgSlug,
    },
  });

  const firstAvailableDate = Object.keys(availableSlots.slots)[0];
  const firstSlot = availableSlots?.slots?.[firstAvailableDate]?.[0]?.time;

  return res.status(200).json({
    next_available: firstSlot
      ? dayjs.utc(firstSlot).tz(timezone).format(`dddd [the] Do [at] h:mma [${timezone} timezone]`)
      : undefined,
  });
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
