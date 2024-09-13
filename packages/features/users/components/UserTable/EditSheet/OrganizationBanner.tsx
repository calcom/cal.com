import { trpc } from "@calcom/trpc/react";

export function OrganizationBanner() {
  const {
    data: currentOrganisation,
    isPending: isPendingOrg,
    error,
  } = trpc.viewer.organizations.listCurrent.useQuery(undefined, {});

  return (
    <>
      <div
        className="block w-full rounded-lg ring-1 ring-[#0000000F]"
        style={{
          background: "linear-gradient(to top right, var(--cal-bg-emphasis), var(--cal-bg))",
          height: currentOrganisation && currentOrganisation?.bannerUrl ? "auto" : "110px",
        }}>
        {currentOrganisation && currentOrganisation?.bannerUrl && (
          <img src={currentOrganisation?.bannerUrl} alt="Organization Banner" className="rounded-lg" />
        )}
      </div>
    </>
  );
}
