import { REDIRECT_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";

export class SubscribeTeamToBillingResponseDto {
  status!: typeof SUCCESS_STATUS | typeof REDIRECT_STATUS;

  url?: string;
}
