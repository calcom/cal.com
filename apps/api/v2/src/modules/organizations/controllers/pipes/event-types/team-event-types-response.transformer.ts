import { OutputOrganizationsEventTypesService } from "@/modules/organizations/services/event-types/output.service";
import { DatabaseTeamEventType } from "@/modules/organizations/services/event-types/output.service";
import { Injectable, PipeTransform } from "@nestjs/common";
import { plainToClass } from "class-transformer";

import { TeamEventTypeOutput_2024_06_14 } from "@calcom/platform-types";

@Injectable()
export class OutputTeamEventTypesResponsePipe implements PipeTransform {
  constructor(private readonly outputOrganizationsEventTypesService: OutputOrganizationsEventTypesService) {}

  private async transformEventType(item: DatabaseTeamEventType): Promise<TeamEventTypeOutput_2024_06_14> {
    return plainToClass(
      TeamEventTypeOutput_2024_06_14,
      await this.outputOrganizationsEventTypesService.getResponseTeamEventType(item, true),
      { strategy: "exposeAll" }
    );
  }

  // Implementing function overloading to ensure correct return types based on input type:
  async transform(value: DatabaseTeamEventType[]): Promise<TeamEventTypeOutput_2024_06_14[]>;

  async transform(value: DatabaseTeamEventType): Promise<TeamEventTypeOutput_2024_06_14>;

  async transform(
    value: DatabaseTeamEventType | DatabaseTeamEventType[]
  ): Promise<TeamEventTypeOutput_2024_06_14 | TeamEventTypeOutput_2024_06_14[]>;

  async transform(
    value: DatabaseTeamEventType | DatabaseTeamEventType[]
  ): Promise<TeamEventTypeOutput_2024_06_14 | TeamEventTypeOutput_2024_06_14[]> {
    if (Array.isArray(value)) {
      return await Promise.all(value.map((item) => this.transformEventType(item)));
    } else {
      return await this.transformEventType(value);
    }
  }
}
