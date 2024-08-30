import { IsEnum } from "class-validator";
import { PlatformPlan } from "src/modules/billing/types";

export class SubscribeToPlanInput {
  @IsEnum(PlatformPlan)
  plan!: PlatformPlan;
}
