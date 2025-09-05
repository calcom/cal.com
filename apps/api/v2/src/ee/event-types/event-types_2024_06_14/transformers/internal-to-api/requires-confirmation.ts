import { ConfirmationPolicyEnum } from "@calcom/platform-enums";
import type { ConfirmationPolicy_2024_06_14, NoticeThresholdTransformedSchema } from "@calcom/platform-types";

export function transformRequiresConfirmationInternalToApi(
  requiresConfirmation: boolean,
  requiresConfirmationWillBlockSlot: boolean,
  requiresConfirmationThreshold?: NoticeThresholdTransformedSchema
): ConfirmationPolicy_2024_06_14 | undefined {
  if (requiresConfirmationThreshold?.unit) {
    return {
      type: ConfirmationPolicyEnum.TIME,
      noticeThreshold: {
        unit: requiresConfirmationThreshold.unit,
        count: requiresConfirmationThreshold.time,
      },
      blockUnconfirmedBookingsInBooker: requiresConfirmationWillBlockSlot,
    };
  } else if (requiresConfirmation) {
    return {
      type: ConfirmationPolicyEnum.ALWAYS,
      blockUnconfirmedBookingsInBooker: requiresConfirmationWillBlockSlot,
    };
  } else if (!requiresConfirmation) {
    return {
      disabled: true,
    };
  }
  return undefined;
}
