import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Tests that the admin watchlist router wires each endpoint to the correct
 * system PBAC permission (watchlist.read, watchlist.create, watchlist.delete, watchlist.update).
 * We assert against the router source so we don't need to mock tRPC.
 */
describe("admin watchlist router (system PBAC wiring)", () => {
  const routerPath = join(__dirname, "_router.ts");
  const source = readFileSync(routerPath, "utf-8");

  describe("permission count per scope", () => {
    it("uses watchlist.read for list, getDetails, listReports, pendingReportsCount, getEntryImpact", () => {
      const matches = source.match(/createSystemPbacProcedure\("watchlist\.read"\)/g);
      expect(matches).toHaveLength(5);
    });

    it("uses watchlist.create for create and addToWatchlist", () => {
      const matches = source.match(/createSystemPbacProcedure\("watchlist\.create"\)/g);
      expect(matches).toHaveLength(2);
    });

    it("uses watchlist.delete for delete and bulkDelete", () => {
      const matches = source.match(/createSystemPbacProcedure\("watchlist\.delete"\)/g);
      expect(matches).toHaveLength(2);
    });

    it("uses watchlist.update for dismissReport and bulkDismiss", () => {
      const matches = source.match(/createSystemPbacProcedure\("watchlist\.update"\)/g);
      expect(matches).toHaveLength(2);
    });
  });

  describe("per-endpoint permission mapping", () => {
    /**
     * Helper: extracts the permission used for a given endpoint name from the router source.
     * Matches patterns like: `endpointName: createSystemPbacProcedure("watchlist.xxx")`
     */
    function getPermissionForEndpoint(endpointName: string): string | null {
      const regex = new RegExp(
        `${endpointName}:\\s*createSystemPbacProcedure\\("(watchlist\\.[a-z]+)"\\)`
      );
      const match = source.match(regex);
      return match ? match[1] : null;
    }

    // Read endpoints
    it.each([
      ["list", "watchlist.read"],
      ["getDetails", "watchlist.read"],
      ["getEntryImpact", "watchlist.read"],
      ["listReports", "watchlist.read"],
      ["pendingReportsCount", "watchlist.read"],
    ])("%s uses %s", (endpoint, expectedPermission) => {
      expect(getPermissionForEndpoint(endpoint)).toBe(expectedPermission);
    });

    // Create endpoints
    it.each([
      ["create", "watchlist.create"],
      ["addToWatchlist", "watchlist.create"],
    ])("%s uses %s", (endpoint, expectedPermission) => {
      expect(getPermissionForEndpoint(endpoint)).toBe(expectedPermission);
    });

    // Delete endpoints
    it.each([
      ["delete", "watchlist.delete"],
      ["bulkDelete", "watchlist.delete"],
    ])("%s uses %s", (endpoint, expectedPermission) => {
      expect(getPermissionForEndpoint(endpoint)).toBe(expectedPermission);
    });

    // Update endpoints
    it.each([
      ["dismissReport", "watchlist.update"],
      ["bulkDismiss", "watchlist.update"],
    ])("%s uses %s", (endpoint, expectedPermission) => {
      expect(getPermissionForEndpoint(endpoint)).toBe(expectedPermission);
    });
  });

  describe("getSystemWatchlistPermissions uses authedAdminProcedure (no PBAC)", () => {
    it("should NOT use createSystemPbacProcedure for getSystemWatchlistPermissions", () => {
      const regex = /getSystemWatchlistPermissions:\s*createSystemPbacProcedure/;
      expect(source).not.toMatch(regex);
    });

    it("should use authedAdminProcedure for getSystemWatchlistPermissions", () => {
      const regex = /getSystemWatchlistPermissions:\s*authedAdminProcedure/;
      expect(source).toMatch(regex);
    });
  });

  describe("all PBAC-protected endpoints use createSystemPbacProcedure", () => {
    it("should have exactly 11 endpoints using createSystemPbacProcedure", () => {
      const matches = source.match(/createSystemPbacProcedure\(/g);
      expect(matches).toHaveLength(11);
    });

    it("should import createSystemPbacProcedure from pbacProcedures", () => {
      expect(source).toContain('import { createSystemPbacProcedure } from "../../../../procedures/pbacProcedures"');
    });
  });
});
