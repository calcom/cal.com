import { _EventTypeModel } from "../eventtype";

export const createEventTypeInput = _EventTypeModel
  .pick({
    title: true,
    slug: true,
    description: true,
    length: true,
    teamId: true,
    schedulingType: true,
    hidden: true,
    locations: true
  })
  .partial({ hidden: true, locations: true })
  .refine((data) => (data.teamId ? data.teamId && data.schedulingType : true), {
    path: ["schedulingType"],
    message: "You must select a scheduling type for team events",
  });
