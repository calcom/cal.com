import { PlatformPlan } from "@/modules/billing/types";
import { IsEnum } from "class-validator";

export class SubscribeToPlanInput {
  @IsEnum(PlatformPlan)
  plan!: PlatformPlan;
}
