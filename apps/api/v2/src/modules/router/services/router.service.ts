import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class RouterService {
  private logger = new Logger("BillingService");

  constructor(private readonly teamsRepository: OrganizationsRepository) {}

  hasEmbedPath(pathWithQuery: string): boolean {
    const onlyPath = pathWithQuery.split("?")[0];
    return onlyPath.endsWith("/embed") || onlyPath.endsWith("/embed/");
  }
}
