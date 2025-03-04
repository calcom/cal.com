import advancedFormat from "dayjs/plugin/advancedFormat";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { ZGetRetellLLMSchema } from "@calcom/features/ee/cal-ai-phone/zod-utils";
import type { TGetRetellLLMSchema } from "@calcom/features/ee/cal-ai-phone/zod-utils";
import { fetcher } from "@calcom/lib/retellAIFetcher";
import prisma from "@calcom/prisma";
import { getAvailableSlots } from "@calcom/trpc/server/routers/viewer/slots/util";

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = schema.safeParse(body);

    if (!response.success) {
      return NextResponse.json({ message: "Invalid Payload" }, { status: 400 });
    }

    const data = response.data;

    const retellLLM = await fetcher(`/get-retell-llm/${data.llm_id}`).then(ZGetRetellLLMSchema.parse);

    const { eventTypeId, timezone } = getEventTypeIdFromRetellLLM(retellLLM);

    if (!eventTypeId || !timezone)
      return NextResponse.json({ message: "eventTypeId or Timezone not found" }, { status: 404 });

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

    if (!eventType) return NextResponse.json({ message: "eventType not found id" }, { status: 404 });

    const now = dayjs();

    const startTime = now.startOf("month").toISOString();
    const endTime = now.add(2, "month").endOf("month").toISOString();
    const orgSlug = eventType?.team?.parent?.slug ?? null;

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

    return NextResponse.json({
      next_available: firstSlot
        ? dayjs.utc(firstSlot).tz(timezone).format(`dddd [the] Do [at] h:mma [${timezone} timezone]`)
        : undefined,
    });
  } catch (error) {
    console.error("Error in get-inbound-dynamic-variables:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
