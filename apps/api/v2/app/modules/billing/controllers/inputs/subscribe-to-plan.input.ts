import { PlatformPlan } from "app/modules/billing/types";
import { IsEnum } from "class-validator";

export class SubscribeToPlanInput {
  @IsEnum(PlatformPlan)
  plan!: PlatformPlan;
}
