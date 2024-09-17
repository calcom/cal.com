import { IsEnum } from "class-validator";

import { PlatformPlan } from "../../../billing/types";

export class SubscribeToPlanInput {
  @IsEnum(PlatformPlan)
  plan!: PlatformPlan;
}
