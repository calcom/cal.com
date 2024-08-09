import type { IncomingMessage } from "http";
import { describe, it, expect } from "vitest";

import { getMainDomainOrgRedirect } from "./getMainDomainOrgRedirect";

const createMockRequest = (url: string, host: string): IncomingMessage => {
  return {
    url,
    headers: {
      host,
    },
  } as IncomingMessage;
};

describe("getMainDomainOrgRedirect", () => {
  // 'users-type-public-view' sub-domain sample with queryparams
  // "http://orgdomain.cal.com/admin/orgevent?month=2024-08&date=2024-08-09"
  it("'users-type-public-view' - should remove sub-domain and generate url with main domain only.", () => {
    const req = createMockRequest("/admin/orgevent?month=2024-08&date=2024-08-09", "orgdomain.cal.com");
    const redirect = getMainDomainOrgRedirect(req);
    expect(redirect).toEqual({
      redirect: {
        permanent: true,
        destination: "http://orgdomain.com/admin/orgevent?month=2024-08&date=2024-08-09",
      },
    });
  });

  // 'users-type-public-view' No sub-domain sample with queryparams
  // "http://orgdomain.com/admin/orgevent?month=2024-08&date=2024-08-09"
  it("'users-type-public-view' - should not generate redirect url when no subdomain.", () => {
    const req = createMockRequest("/admin/orgevent?month=2024-08&date=2024-08-09", "orgdomain.com");
    const redirect = getMainDomainOrgRedirect(req);
    expect(redirect).toBeNull();
  });

  // 'users-public-view' sub-domain sample
  // "http://orgdomain.cal.com/admin"
  it("'users-public-view' - should remove sub-domain and generate url with main domain only.", () => {
    const req = createMockRequest("/admin", "orgdomain.cal.com");
    const redirect = getMainDomainOrgRedirect(req);
    expect(redirect).toEqual({
      redirect: {
        permanent: true,
        destination: "http://orgdomain.com/admin",
      },
    });
  });

  // 'users-public-view' No sub-domain sample
  // "http://orgdomain.com/admin"
  it("'users-public-view' - should not generate redirect url when no subdomain.", () => {
    const req = createMockRequest("/admin", "orgdomain.com");
    const redirect = getMainDomainOrgRedirect(req);
    expect(redirect).toBeNull();
  });

  // 'team/[slug]' sub-domain sample
  // "http://orgdomain.cal.com/team/orgTeam"
  it("'team/[slug]' - should remove sub-domain and generate url with main domain only.", () => {
    const req = createMockRequest("/team/orgTeam", "orgdomain.cal.com");
    const redirect = getMainDomainOrgRedirect(req);
    expect(redirect).toEqual({
      redirect: {
        permanent: true,
        destination: "http://orgdomain.com/team/orgTeam",
      },
    });
  });

  // 'team/[slug]' No sub-domain sample
  // "http://orgdomain.com/team/orgTeam"
  it("'team/[slug]' - should not generate redirect url when no subdomain.", () => {
    const req = createMockRequest("/team/orgTeam", "orgdomain.com");
    const redirect = getMainDomainOrgRedirect(req);
    expect(redirect).toBeNull();
  });
});
