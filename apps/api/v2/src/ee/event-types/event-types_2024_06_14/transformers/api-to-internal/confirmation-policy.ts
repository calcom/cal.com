import { ConfirmationPolicyEnum } from "@calcom/platform-enums";
import type {
  ConfirmationPolicyTransformedSchema,
  CreateEventTypeInput_2024_06_14,
  NoticeThresholdTransformedSchema,
} from "@calcom/platform-types";

export function transformConfirmationPolicyApiToInternal(
  inputConfirmationPolicy: CreateEventTypeInput_2024_06_14["confirmationPolicy"]
): ConfirmationPolicyTransformedSchema | undefined {
  if (!inputConfirmationPolicy) return undefined;
  if (inputConfirmationPolicy.disabled) {
    return {
      requiresConfirmation: false,
      requiresConfirmationWillBlockSlot: false,
      requiresConfirmationThreshold: undefined,
    };
  }
  switch (inputConfirmationPolicy.type) {
    case ConfirmationPolicyEnum.ALWAYS:
      return {
        requiresConfirmation: true,
        requiresConfirmationThreshold: undefined,
        requiresConfirmationWillBlockSlot: inputConfirmationPolicy.blockUnconfirmedBookingsInBooker,
      };
    case ConfirmationPolicyEnum.TIME:
      return {
        requiresConfirmation: true,
        requiresConfirmationThreshold: {
          unit: inputConfirmationPolicy.noticeThreshold?.unit,
          time: inputConfirmationPolicy.noticeThreshold?.count,
        } as NoticeThresholdTransformedSchema,
        requiresConfirmationWillBlockSlot: inputConfirmationPolicy.blockUnconfirmedBookingsInBooker,
      };
  }
}
