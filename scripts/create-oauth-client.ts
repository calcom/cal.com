#!/usr/bin/env node

/**
 * OAuth Client Generator for Cal.com Platform API
 * 
 * This script allows you to create OAuth clients for the Cal.com Platform API (v2)
 * without needing to host the frontend or use API keys.
 * 
 * Usage:
 *   npx tsx scripts/create-oauth-client.ts --orgId <orgId> --name <name> [options]
 * 
 * Options:
 *   --orgId, -o          Organization/Team ID (required)
 *   --name, -n           OAuth client name (required)
 *   --redirectUri, -r    Redirect URI (can be specified multiple times)
 *   --permissions, -p    Permissions (comma-separated or "*" for all)
 *   --areEmailsEnabled   Enable emails (default: true)
 *   --help, -h           Show this help message
 */

import { createHash } from "crypto";
import { PrismaClient } from "@calcom/prisma";
import { sign } from "jsonwebtoken";

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
} as const;

interface CreateOAuthClientOptions {
  organizationId: number;
  name: string;
  redirectUris: string[];
  permissions: string[];
  areEmailsEnabled?: boolean;
  bookingRedirectUri?: string;
  bookingCancelRedirectUri?: string;
  bookingRescheduleRedirectUri?: string;
}

function transformPermissions(permissions: string[]): number {
  if (permissions.includes("*")) {
    return Object.values(PERMISSION_MAP).reduce((acc, val) => acc | val, 0);
  }
  
  const values = permissions.map((p) => {
    const key = p as keyof typeof PERMISSION_MAP;
    if (!(key in PERMISSION_MAP)) {
      throw new Error(`Invalid permission: ${p}. Valid permissions: ${Object.keys(PERMISSION_MAP).join(", ")}, *`);
    }
    return PERMISSION_MAP[key];
  });
  
  return values.reduce((acc, val) => acc | val, 0);
}

function generateClientSecret(data: any): string {
  const secret = process.env.CALENDSO_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "secret";
  return sign(data, secret);
}

async function createOAuthClient(options: CreateOAuthClientOptions): Promise<{ clientId: string; clientSecret: string }> {
  const prisma = new PrismaClient();
  
  try {
    // Verify organization exists and has platform billing
    const organization = await prisma.team.findUnique({
      where: { id: options.organizationId },
      include: { platformBilling: true }
    });
    
    if (!organization) {
      throw new Error(`Organization with ID ${options.organizationId} not found`);
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
    const permissionsInt = transformPermissions(options.permissions);
    
    // Create the OAuth client data for JWT
    const clientData = {
      name: options.name,
      permissions: permissionsInt,
      redirectUris: options.redirectUris,
      bookingRedirectUri: options.bookingRedirectUri || "",
      bookingCancelRedirectUri: options.bookingCancelRedirectUri || "",
      bookingRescheduleRedirectUri: options.bookingRescheduleRedirectUri || "",
      areEmailsEnabled: options.areEmailsEnabled ?? true,
      iat: Math.floor(Date.now() / 1000),
    };
    
    // Generate client secret (JWT)
    const clientSecret = generateClientSecret(clientData);
    
    // Create OAuth client in database
    const oauthClient = await prisma.platformOAuthClient.create({
      data: {
        name: options.name,
        secret: clientSecret,
        permissions: permissionsInt,
        redirectUris: options.redirectUris,
        organizationId: options.organizationId,
        areEmailsEnabled: options.areEmailsEnabled ?? true,
        bookingRedirectUri: options.bookingRedirectUri,
        bookingCancelRedirectUri: options.bookingCancelRedirectUri,
        bookingRescheduleRedirectUri: options.bookingRescheduleRedirectUri,
      },
    });
    
    console.log("✅ OAuth Client created successfully!");
    console.log(`📋 Client ID: ${oauthClient.id}`);
    console.log(`🔑 Client Secret: ${oauthClient.secret}`);
    console.log(`🏢 Organization ID: ${oauthClient.organizationId}`);
    console.log(`📝 Name: ${oauthClient.name}`);
    console.log(`🔐 Permissions: ${options.permissions.join(", ")}`);
    console.log(`🔗 Redirect URIs: ${oauthClient.redirectUris.join(", ")}`);
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
  
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
OAuth Client Generator for Cal.com Platform API

Usage:
  npx tsx scripts/create-oauth-client.ts --orgId <orgId> --name <name> [options]

Options:
  --orgId, -o          Organization/Team ID (required)
  --name, -n           OAuth client name (required)
  --redirectUri, -r    Redirect URI (can be specified multiple times)
  --permissions, -p    Permissions (comma-separated or "*" for all)
  --areEmailsEnabled   Enable emails (default: true)
  --bookingRedirectUri Booking redirect URI (optional)
  --help, -h           Show this help message

Available Permissions:
  BOOKING_READ, BOOKING_WRITE, EVENT_TYPE_READ, EVENT_TYPE_WRITE,
  SCHEDULE_READ, SCHEDULE_WRITE, USER_READ, USER_WRITE,
  CALENDAR_READ, CALENDAR_WRITE, * (all permissions)

Examples:
  # Create OAuth client with all permissions
  npx tsx scripts/create-oauth-client.ts --orgId 123 --name "My App" --redirectUri "http://localhost:3000/callback" --permissions "*"
  
  # Create OAuth client with specific permissions
  npx tsx scripts/create-oauth-client.ts --orgId 123 --name "Booking App" --redirectUri "https://example.com/callback" --permissions "BOOKING_READ,BOOKING_WRITE"
  
  # Create OAuth client with multiple redirect URIs
  npx tsx scripts/create-oauth-client.ts --orgId 123 --name "Multi-env App" --redirectUri "http://localhost:3000/callback" --redirectUri "https://example.com/callback" --permissions "*"
`);
    process.exit(0);
  }
  
  // Parse command line arguments
  let organizationId: number | undefined;
  let name: string | undefined;
  const redirectUris: string[] = [];
  let permissions: string[] = ["*"];
  let areEmailsEnabled = true;
  let bookingRedirectUri: string | undefined;
  let bookingCancelRedirectUri: string | undefined;
  let bookingRescheduleRedirectUri: string | undefined;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case "--orgId":
      case "-o":
        organizationId = parseInt(nextArg);
        if (isNaN(organizationId)) {
          console.error("❌ Error: --orgId must be a valid number");
          process.exit(1);
        }
        i++;
        break;
      case "--name":
      case "-n":
        name = nextArg;
        i++;
        break;
      case "--redirectUri":
      case "-r":
        redirectUris.push(nextArg);
        i++;
        break;
      case "--permissions":
      case "-p":
        permissions = nextArg.split(",").map(p => p.trim());
        i++;
        break;
      case "--areEmailsEnabled":
        areEmailsEnabled = nextArg === "true" || nextArg === "1";
        i++;
        break;
      case "--bookingRedirectUri":
        bookingRedirectUri = nextArg;
        i++;
        break;
      case "--bookingCancelRedirectUri":
        bookingCancelRedirectUri = nextArg;
        i++;
        break;
      case "--bookingRescheduleRedirectUri":
        bookingRescheduleRedirectUri = nextArg;
        i++;
        break;
    }
  }
  
  if (!organizationId) {
    console.error("❌ Error: --orgId is required");
    console.error("Use --help for usage information");
    process.exit(1);
  }
  
  if (!name) {
    console.error("❌ Error: --name is required");
    console.error("Use --help for usage information");
    process.exit(1);
  }
  
  if (redirectUris.length === 0) {
    console.error("❌ Error: At least one --redirectUri is required");
    console.error("Use --help for usage information");
    process.exit(1);
  }
  
  try {
    await createOAuthClient({
      organizationId,
      name,
      redirectUris,
      permissions,
      areEmailsEnabled,
      bookingRedirectUri,
      bookingCancelRedirectUri,
      bookingRescheduleRedirectUri,
    });
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

export { createOAuthClient };
