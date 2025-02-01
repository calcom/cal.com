const fetch = require("node-fetch");
const assert = require("assert");

const BASE_URL = "http://localhost:3000";
const ROUTES = ["/routing-forms/form-edit", "/routing-forms/forms", "/routing-forms/route-builder"];

const ROUTES_WITH_404 = ["/routing-forms/routing-link/test-form-id"];

// TRPC endpoint to test
const TRPC_ENDPOINT = "/api/trpc/viewer.routingForms.forms";

// Add delay between requests
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function verifyRoute(route, expectedStatus = 200) {
  try {
    console.log(`Testing route ${route}...`);
    const response = await fetch(`${BASE_URL}${route}`);
    console.log(`Route ${route} returned status code: ${response.status}`);
    assert.strictEqual(response.status, expectedStatus, `Route ${route} should return ${expectedStatus}`);
    const html = await response.text();
    assert.ok(html.includes("</html>"), `Route ${route} should return HTML`);
    console.log(`✅ Route ${route} is working`);
    // Add 2 second delay between requests
    await delay(2000);
  } catch (error) {
    console.error(`❌ Route ${route} failed:`, error.message);
    process.exit(1);
  }
}

async function verifyTRPC() {
  try {
    console.log("Testing TRPC endpoint...");
    const response = await fetch(`${BASE_URL}${TRPC_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        json: {
          type: "query",
        },
      }),
    });

    assert.ok(
      [200, 401].includes(response.status),
      `TRPC endpoint should return 200 or 401 (if unauthorized)`
    );
    console.log("✅ TRPC endpoint is responding");
  } catch (error) {
    console.error("❌ TRPC endpoint failed:", error.message);
    process.exit(1);
  }
}

async function main() {
  console.log("Starting verification...");
  console.log("Waiting 5 seconds for dev server to be ready...");
  await delay(5000);

  // Verify all routes
  for (const route of ROUTES) {
    await verifyRoute(route);
  }

  // Verify routes that should return 404
  for (const route of ROUTES_WITH_404) {
    await verifyRoute(route, 404);
  }

  // Verify TRPC endpoint
  await verifyTRPC();

  console.log("All verifications passed! ✨");
}

main().catch(console.error);
