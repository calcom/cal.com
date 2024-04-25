import { SUCCESS_STATUS } from "@calcom/platform-constants";

export class CheckPlatformBillingResponseDto {
  status!: typeof SUCCESS_STATUS;

  valid!: boolean;
}
