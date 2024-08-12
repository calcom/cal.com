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
  it("should generate url with input hostname on visiting org home page.", () => {
    const req = createMockRequest("", "orgdomain.cal.com");
    const redirect = getMainDomainOrgRedirect(req, ["marketing", "sales"], "orgdomain.com");
    expect(redirect).toEqual({
      redirect: {
        permanent: true,
        destination: "http://orgdomain.com/?redirectDomainSlug=orgdomain",
      },
    });
  });

  it("should generate url with input hostname on visiting org team page - '/[team]'.", () => {
    const req = createMockRequest("/marketing", "orgdomain.cal.com");
    const redirect = getMainDomainOrgRedirect(req, ["marketing", "sales"], "orgdomain.com");
    expect(redirect).toEqual({
      redirect: {
        permanent: true,
        destination: "http://orgdomain.com/marketing?redirectDomainSlug=orgdomain",
      },
    });
  });

  it("should not change url on visiting any page other than home or team page.", () => {
    const req = createMockRequest("/admin", "orgdomain.cal.com");
    const redirect = getMainDomainOrgRedirect(req, ["marketing", "sales"], "orgdomain.com");
    expect(redirect).toBeNull();
  });

  it("should not redirect/change url if already redirected.", () => {
    const req = createMockRequest("/marketing", "orgdomain.com");
    const redirect = getMainDomainOrgRedirect(req, ["marketing", "sales"], "orgdomain.com");
    expect(redirect).toBeNull();
  });
});
