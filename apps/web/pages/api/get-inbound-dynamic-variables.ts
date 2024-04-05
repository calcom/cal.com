import advancedFormat from "dayjs/plugin/advancedFormat";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { fetcher } from "@calcom/lib/retellAIFetcher";
import { defaultHandler } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import { getRetellLLMSchema } from "@calcom/prisma/zod-utils";
import type { TGetRetellLLMSchema } from "@calcom/prisma/zod-utils";
import { getAvailableSlots } from "@calcom/trpc/server/routers/viewer/slots/util";

dayjs.extend(advancedFormat);

const schema = z.object({
  llm_id: z.string(),
  from_number: z.string(),
  to_number: z.string(),
});

const getEventTypeIdFromRetellLLM = (
  generalTools: TGetRetellLLMSchema["general_tools"]
): number | undefined => {
  const generalTool = generalTools.find((tool) => !!tool.event_type_id && !!tool.timezone);

  return generalTool?.event_type_id;
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const response = schema.safeParse(req.body);

  if (!response.success) {
    return res.status(400).send({
      message: "Invalid Payload",
    });
  }

  const body = response.data;

  const retellLLM = await fetcher(`/get-retell-llm/${body.llm_id}`).then(getRetellLLMSchema.parse);

  const eventTypeId = getEventTypeIdFromRetellLLM(retellLLM.general_tools);

  if (!eventTypeId) return res.status(404).json({ message: "eventTypeId not found" });

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
  const orgSlug = eventType?.team?.parent?.slug ?? undefined;

  const availableSlots = await getAvailableSlots({
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
    next_available: firstSlot ? dayjs.utc(firstSlot).format("dddd [the] Do [at] h:mma [GMT]") : undefined,
  });
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
