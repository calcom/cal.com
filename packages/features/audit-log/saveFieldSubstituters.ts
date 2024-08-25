import { FieldSubstituterOption } from "./types/TFieldSubstituterInput";
import type TFieldSubstituterInput from "./types/TFieldSubstituterInput";
import {
  substituteEventTypeDelete,
  substituteEventTypeDeleteMany,
  substituteUserCreate,
  substituteUserUpdate,
  substituteUserDelete,
  substituteTeamDelete,
} from "./util/fieldSubstituter";

export default async function saveFieldSubstituters(input: TFieldSubstituterInput) {
  switch (input.triggeredEvent) {
    case FieldSubstituterOption.EventTypeDelete:
      await substituteEventTypeDelete(input.deletedEventType);
      break;
    case FieldSubstituterOption.EventTypeDeleteMany:
      await substituteEventTypeDeleteMany(input.deletedEventTypes);
      break;
    case FieldSubstituterOption.UserCreate:
      await substituteUserCreate(input.createdUser);
      break;
    case FieldSubstituterOption.UserUpdate:
      await substituteUserUpdate(input.prevUser, input.updatedUser);
      break;
    case FieldSubstituterOption.UserDelete:
      await substituteUserDelete(input.deletedUser);
      break;
    case FieldSubstituterOption.TeamDelete:
      await substituteTeamDelete(input.deletedTeam);
      break;
    default:
      // console.warn(`Unhandled audit log event type: ${input.triggeredEvent}`);
      break;
  }
}
