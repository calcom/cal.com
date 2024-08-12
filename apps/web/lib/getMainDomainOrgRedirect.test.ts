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
  it("should remove sub-domain and generate url with main domain only - 'users-type-public-view'.", () => {
    const req = createMockRequest("/admin/orgevent?month=2024-08&date=2024-08-09", "orgdomain.cal.com");
    const redirect = getMainDomainOrgRedirect(req);
    expect(redirect).toEqual({
      redirect: {
        permanent: true,
        destination: "http://orgdomain.com/admin/orgevent?month=2024-08&date=2024-08-09",
      },
    });
  });

  it("should not generate redirect url when no subdomain - 'users-type-public-view'.", () => {
    const req = createMockRequest("/admin/orgevent?month=2024-08&date=2024-08-09", "orgdomain.com");
    const redirect = getMainDomainOrgRedirect(req);
    expect(redirect).toBeNull();
  });

  it("should remove sub-domain and generate url with main domain only - 'users-public-view'.", () => {
    const req = createMockRequest("/admin", "orgdomain.cal.com");
    const redirect = getMainDomainOrgRedirect(req);
    expect(redirect).toEqual({
      redirect: {
        permanent: true,
        destination: "http://orgdomain.com/admin",
      },
    });
  });

  it("should not generate redirect url when no subdomain - 'users-public-view'.", () => {
    const req = createMockRequest("/admin", "orgdomain.com");
    const redirect = getMainDomainOrgRedirect(req);
    expect(redirect).toBeNull();
  });

  it("should remove sub-domain and generate url with main domain only - 'team/[slug]'.", () => {
    const req = createMockRequest("/orgTeam", "orgdomain.cal.com");
    const redirect = getMainDomainOrgRedirect(req);
    expect(redirect).toEqual({
      redirect: {
        permanent: true,
        destination: "http://orgdomain.com/orgTeam",
      },
    });
  });

  it("should not generate redirect url when no subdomain - 'team/[slug]'.", () => {
    const req = createMockRequest("/orgTeam", "orgdomain.com");
    const redirect = getMainDomainOrgRedirect(req);
    expect(redirect).toBeNull();
  });
});
