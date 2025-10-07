#!/usr/bin/env node

/**
 * Simple OAuth Client Creator for Cal.com
 * 
 * This is a simplified JavaScript version that can be run directly with Node.js
 * without requiring TypeScript compilation.
 * 
 * Usage:
 *   node scripts/create-oauth-client.js <orgId> <name> <redirectUri> [permissions]
 * 
 * Examples:
 *   node scripts/create-oauth-client.js 123 "My App" "http://localhost:3000/callback"
 *   node scripts/create-oauth-client.js 123 "My App" "http://localhost:3000/callback" "*"
 *   node scripts/create-oauth-client.js 123 "My App" "https://example.com/callback" "BOOKING_READ,BOOKING_WRITE"
 */

const { sign } = require("jsonwebtoken");
const { PrismaClient } = require("@calcom/prisma");

const PERMISSION_MAP = {
  BOOKING_READ: 1,
  BOOKING_WRITE: 2,
  EVENT_TYPE_READ: 4,
  EVENT_TYPE_WRITE: 8,
  SCHEDULE_READ: 16,
  SCHEDULE_WRITE: 32,
  USER_READ: 64,
  USER_WRITE: 128,
  CALENDAR_READ: 256,
  CALENDAR_WRITE: 512,
};

function transformPermissions(permissions) {
  if (permissions.includes("*")) {
    return Object.values(PERMISSION_MAP).reduce((acc, val) => acc | val, 0);
  }
  
  const values = permissions.map((p) => {
    if (!(p in PERMISSION_MAP)) {
      throw new Error(`Invalid permission: ${p}. Valid permissions: ${Object.keys(PERMISSION_MAP).join(", ")}, *`);
    }
    return PERMISSION_MAP[p];
  });
  
  return values.reduce((acc, val) => acc | val, 0);
}

function generateClientSecret(data) {
  const secret = process.env.CALENDSO_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "secret";
  return sign(data, secret);
}

async function createOAuthClient(organizationId, name, redirectUri, permissions = ["*"]) {
  const prisma = new PrismaClient();
  
  try {
    // Verify organization exists and has platform billing
    const organization = await prisma.team.findUnique({
      where: { id: parseInt(organizationId) },
      include: { platformBilling: true }
    });
    
    if (!organization) {
      throw new Error(`Organization with ID ${organizationId} not found`);
    }
    
    // Check if organization has platform billing (or create it for dev/testing)
    if (!organization.platformBilling) {
      console.log("⚠️  Organization doesn't have platform billing. Creating platform billing record...");
      await prisma.platformBilling.create({
        data: {
          id: organization.id,
          plan: "SCALE",
          customerId: `cus_${Date.now()}`,
          subscriptionId: `sub_${Date.now()}`,
        },
      });
    }
    
    // Transform permissions to integer
    const permissionsInt = transformPermissions(permissions);
    
    // Create the OAuth client data for JWT
    const clientData = {
      name: name,
      permissions: permissionsInt,
      redirectUris: [redirectUri],
      bookingRedirectUri: "",
      bookingCancelRedirectUri: "",
      bookingRescheduleRedirectUri: "",
      areEmailsEnabled: true,
      iat: Math.floor(Date.now() / 1000),
    };
    
    // Generate client secret (JWT)
    const clientSecret = generateClientSecret(clientData);
    
    // Create OAuth client in database
    const oauthClient = await prisma.platformOAuthClient.create({
      data: {
        name: name,
        secret: clientSecret,
        permissions: permissionsInt,
        redirectUris: [redirectUri],
        organizationId: parseInt(organizationId),
        areEmailsEnabled: true,
      },
    });
    
    console.log("✅ OAuth Client created successfully!");
    console.log(`📋 Client ID: ${oauthClient.id}`);
    console.log(`🔑 Client Secret: ${oauthClient.secret}`);
    console.log(`🏢 Organization ID: ${oauthClient.organizationId}`);
    console.log(`📝 Name: ${oauthClient.name}`);
    console.log(`🔐 Permissions: ${permissions.join(", ")}`);
    console.log(`🔗 Redirect URI: ${oauthClient.redirectUris.join(", ")}`);
    console.log("");
    console.log("🔑 OAuth Client Credentials Authentication:");
    console.log(`   Headers:`);
    console.log(`     x-cal-client-id: ${oauthClient.id}`);
    console.log(`     x-cal-secret-key: ${oauthClient.secret}`);
    console.log("");
    console.log("⚠️  IMPORTANT: Store these credentials securely. The client secret cannot be retrieved again!");
    
    return {
      clientId: oauthClient.id,
      clientSecret: oauthClient.secret,
    };
    
  } finally {
    await prisma.$disconnect();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
Simple OAuth Client Creator for Cal.com

Usage:
  node scripts/create-oauth-client.js <orgId> <name> <redirectUri> [permissions]

Arguments:
  orgId        Organization/Team ID (required)
  name         OAuth client name (required)
  redirectUri  Redirect URI (required)
  permissions  Permissions (comma-separated or "*" for all, default: "*")

Available Permissions:
  BOOKING_READ, BOOKING_WRITE, EVENT_TYPE_READ, EVENT_TYPE_WRITE,
  SCHEDULE_READ, SCHEDULE_WRITE, USER_READ, USER_WRITE,
  CALENDAR_READ, CALENDAR_WRITE, * (all permissions)

Examples:
  # Create OAuth client with all permissions
  node scripts/create-oauth-client.js 123 "My App" "http://localhost:3000/callback"
  
  # Create OAuth client with specific permissions
  node scripts/create-oauth-client.js 123 "Booking App" "https://example.com/callback" "BOOKING_READ,BOOKING_WRITE"
`);
    process.exit(0);
  }
  
  const orgId = args[0];
  const name = args[1];
  const redirectUri = args[2];
  const permissions = args[3] ? args[3].split(",").map(p => p.trim()) : ["*"];
  
  if (!orgId) {
    console.error("❌ Error: orgId is required");
    console.error("Use --help for usage information");
    process.exit(1);
  }
  
  if (!name) {
    console.error("❌ Error: name is required");
    console.error("Use --help for usage information");
    process.exit(1);
  }
  
  if (!redirectUri) {
    console.error("❌ Error: redirectUri is required");
    console.error("Use --help for usage information");
    process.exit(1);
  }
  
  try {
    await createOAuthClient(orgId, name, redirectUri, permissions);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

module.exports = { createOAuthClient };
