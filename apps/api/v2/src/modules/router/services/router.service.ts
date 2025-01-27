import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class RouterService {
  private logger = new Logger("BillingService");

  hasEmbedPath(pathWithQuery: string): boolean {
    const onlyPath = pathWithQuery.split("?")[0];
    return onlyPath.endsWith("/embed") || onlyPath.endsWith("/embed/");
  }
}
