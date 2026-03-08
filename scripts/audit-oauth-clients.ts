import { prisma } from "@calcom/prisma";
import fs from "node:fs";

/**
 * Script to identify any existing OAuth clients that will break after the `clientSecret` column is dropped.
 * 
 * RUN THIS IN PRODUCTION BEFORE DEPLOYING THE OAUTH SECRET DROP PR.
 * 
 * Criteria for a breaking client:
 * - clientType is CONFIDENTIAL
 * - Secret flow was historically used (we unfortunately don't have a direct flag for this, but if a client exists
 *   from before this PR, it might not be using PKCE). We should specifically look for CONFIDENTIAL clients that 
 *   do not have PKCE enforced (if such a flag existed, though `enablePkce` wasn't historically enforced).
 * 
 * Since older CONFIDENTIAL clients inherently relied on `clientSecret`, any CONFIDENTIAL client created before 
 * this deployment is AT RISK of breaking if they haven't manually updated their app code to use PKCE.
 */
async function auditConfidentialClients() {
  try {
    console.log("Starting audit of at-risk OAuth Clients...");

    // Find all active CONFIDENTIAL clients
    const atRiskClients = await prisma.oAuthClient.findMany({
      where: {
        clientType: "CONFIDENTIAL",
      },
      select: {
        name: true,
        clientId: true,
        userId: true, // we need the owner to contact them
        user: {
          select: {
            email: true,
            name: true,
          }
        },
        createdAt: true,
      }
    });

    if (atRiskClients.length === 0) {
      console.log("✅ Success: No CONFIDENTIAL clients found. The `clientSecret` schema drop is safe to deploy immediately.");
      return;
    }

    console.warn(`\n⚠️ WARNING: Found ${atRiskClients.length} at-risk CONFIDENTIAL clients.`);
    console.warn("These integrations WILL BREAK when the `clientSecret` migration is deployed if the developers have not manually implemented PKCE.\n");

    const report = atRiskClients.map(c => ({
      name: c.name,
      clientId: c.clientId,
      ownerEmail: c.user?.email || "Unknown",
      ownerName: c.user?.name || "Unknown",
      createdAt: c.createdAt.toISOString()
    }));

    console.table(report.map(({ ownerEmail: _ownerEmail, ownerName: _ownerName, ...safe }) => safe));

    // Save to CSV for operator outreach
    const csvHeader = "App Name,Client ID,Owner Name,Owner Email,Created At\n";
    
    // Helper to escape CSV fields to prevent injection (quotes and formula characters)
    const escapeCsv = (str: string) => {
      // Check for formula injection (starts with =, +, -, @) after potential whitespace/control chars
      // We prepend an apostrophe to ensure the cell is interpreted as a literal string in spreadsheets.
      const sanitized = /^[\s\x00-\x1F]*[=+\-@]/.test(str) ? "'" + str : str;
      return `"${sanitized.replace(/"/g, '""')}"`;
    };

    const csvRows = report.map(r => 
      `${escapeCsv(r.name)},${escapeCsv(r.clientId)},${escapeCsv(r.ownerName)},${escapeCsv(r.ownerEmail)},${escapeCsv(r.createdAt)}`
    ).join("\n");
    
    fs.writeFileSync("at-risk-oauth-clients.csv", csvHeader + csvRows);
    console.log("\n📄 Saved detailed report to 'at-risk-oauth-clients.csv'.");
    console.log("\nACTION REQUIRED: Please email the owners of these applications and require them to migrate to PKCE (add code_challenge and code_verifier) BEFORE merging the PR.");

  } catch (error) {
    console.error("Audit failed:", error);
    process.exit(1);
  } finally {
    // prisma instance is shared, we don't necessarily need to disconnect here in a script that ends
  }
}

auditConfidentialClients();
