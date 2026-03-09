import { CancellationReasonRequirement } from "@calcom/prisma/enums";

export function isCancellationReasonRequired(
  setting: CancellationReasonRequirement | null | undefined,
  isHost: boolean
): boolean {
  const requirement = setting ?? CancellationReasonRequirement.MANDATORY_HOST_ONLY;

  switch (requirement) {
    case CancellationReasonRequirement.OPTIONAL_BOTH:
      return false;
    case CancellationReasonRequirement.MANDATORY_BOTH:
      return true;
    case CancellationReasonRequirement.MANDATORY_HOST_ONLY:
      return isHost;
    case CancellationReasonRequirement.MANDATORY_ATTENDEE_ONLY:
      return !isHost;
    default:
      return false;
  }
}
