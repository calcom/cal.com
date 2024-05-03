import { IsString } from "class-validator";

type PlatformPlan = "STARTER" | "ESSENTIALS" | "SCALE" | "ENTERPRISE";

export class SubscribeTeamInput {
  @IsString()
  plan!: PlatformPlan;
}
