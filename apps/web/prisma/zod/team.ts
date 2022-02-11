import * as z from "zod";
import * as imports from "../zod-utils";
import { CompleteMembership, MembershipModel, CompleteEventType, EventTypeModel } from "./index";

export const _TeamModel = z.object({
  id: z.number().int(),
  name: z.string().nullish(),
  slug: z.string().nullish(),
  logo: z.string().nullish(),
  bio: z.string().nullish(),
  hideBranding: z.boolean(),
});

export interface CompleteTeam extends z.infer<typeof _TeamModel> {
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
