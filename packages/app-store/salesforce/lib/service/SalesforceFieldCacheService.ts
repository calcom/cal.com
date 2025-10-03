import type { Connection } from "@jsforce/jsforce-node";

export class SalesforceFieldCacheService {
  private conn: Connection;

  constructor(conn: Connection) {
    this.conn = conn;
  }
}
