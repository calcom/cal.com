import { _generateMetadata } from "app/_utils";
import { revalidatePath } from "next/cache";

import { validateUserHasOrgAdmin } from "../../actions/validateUserHasOrgAdmin";
import { OptInContent } from "./_components/OptInContent";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("roles_and_permissions"),
    (t) => t("roles_and_permissions_opt_in_description"),
    undefined,
    undefined,
    "/settings/organizations/roles/opt-in"
  );

async function revalidateRolesPath() {
  "use server";
  revalidatePath("/settings/organizations/roles");
}

const Page = async () => {
  const session = await validateUserHasOrgAdmin();

  if (!session?.user?.org?.id) {
    throw new Error("Organization not found");
  }

  return <OptInContent revalidateRolesPath={revalidateRolesPath} />;
};

export default Page;
