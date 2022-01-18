import type { Team } from "@prisma/client";
import * as z from "zod";

import * as imports from "../zod-utils";
import { CompleteMembership, MembershipModel, CompleteEventType, EventTypeModel } from "./index";

export const _TeamModel = z.object({
  id: z.number().int(),
  name: z.string().nullable(),
  slug: z.string().nullable(),
  logo: z.string().nullable(),
  bio: z.string().nullable(),
  hideBranding: z.boolean(),
});

export interface CompleteTeam extends Team {
  members: CompleteMembership[];
  eventTypes: CompleteEventType[];
}

/**
 * TeamModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const TeamModel: z.ZodSchema<CompleteTeam> = z.lazy(() =>
  _TeamModel.extend({
    members: MembershipModel.array(),
    eventTypes: EventTypeModel.array(),
  })
);
