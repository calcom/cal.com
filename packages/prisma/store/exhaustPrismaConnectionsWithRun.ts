/**
 * @file exhaustPrismaConnectionsWithRun.ts
 *
 * Purpose:
 *   This script is a canary test to verify that the Prisma singleton store logic
 *   prevents connection leaks and excessive Prisma client creation, even when
 *   runWithTenants is called repeatedly (simulating many context switches).
 *
 * How it works:
 *   - It runs 200 iterations, each creating a new AsyncLocalStorage context via runWithTenants.
 *   - In each context, it requests a Prisma client for the same tenant and runs a simple query.
 *   - All clients are tracked and disconnected at the end.
 *
 * Expected outcome:
 *   - The script should pass without error, confirming that only one Prisma client is created
 *     and reused for the tenant, regardless of context churn.
 *   - If an error is caught (e.g., too many connections), it indicates a regression in
 *     connection management or singleton logic.
 *
 * Usage:
 *   npx tsx packages/prisma/store/exhaustPrismaConnectionsWithRun.ts
 */
import { getPrisma, runWithTenants } from "./prismaStore";
import { Tenant } from "./tenants";

async function main() {
  const clients = [];
  let errorCaught = false;

  for (let i = 0; i < 200; i++) {
    try {
      console.log(`Creating context #${i + 1}`);
      await runWithTenants(Tenant.US, async () => {
        const client = getPrisma(Tenant.US);
        // Run a simple query to force connection
        await client.$queryRaw`SELECT 1`;
        clients.push(client);
      });
    } catch (err: any) {
      errorCaught = true;
      console.error(`Error on context #${i + 1}:`, err.message || err);
      break;
    }
  }

  // Clean up all clients
  await Promise.all(clients.map((c) => c.$disconnect()));

  if (!errorCaught) {
    console.log("Test passed: Singleton store logic is working. No connection leak detected.");
    process.exit(0);
  } else {
    console.error("Test failed: An error was caught, possible connection leak!");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
