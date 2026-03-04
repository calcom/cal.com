export const getBookerBaseUrlSync = jest.fn((slug: string | null) => {
  if (!slug) return "https://cal.com";
  return `https://${slug}.cal.com`;
});

export const getOrgFullOrigin = jest.fn();
export const subdomainSuffix = "cal.com";

export class OrganizationRepository {
  protected readonly prismaClient: unknown;
  constructor(deps: { prismaClient: unknown }) {
    this.prismaClient = deps.prismaClient;
  }
}
