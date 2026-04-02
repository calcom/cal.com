import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function gotoPathAndExpectRedirectToOrgDomain({
  page,
  org,
  path,
  expectedPath,
}: {
  page: Page;
  org: { slug: string | null };
  path: string;
  expectedPath: string;
}) {
  if (!org.slug) {
    throw new Error("Org slug is not defined");
  }
  page.goto(path).catch((e) => {
    console.log("Expected navigation error to happen");
  });

  const orgSlug = org.slug;

  const orgRedirectUrl = await new Promise(async (resolve) => {
    page.on("request", (request) => {
      if (request.isNavigationRequest()) {
        const requestedUrl = request.url();
        console.log("Requested navigation to", requestedUrl);
        // Resolve on redirection to org domain
        if (requestedUrl.includes(orgSlug)) {
          resolve(requestedUrl);
        }
      }
    });
  });

  expect(orgRedirectUrl).toContain(`${getOrgFullOrigin(org.slug)}${expectedPath}`);
}
