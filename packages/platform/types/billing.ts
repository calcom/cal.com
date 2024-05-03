import { IsString } from "class-validator";

export class SubscribeTeamInput {
  @IsString()
  plan!: string;
}
