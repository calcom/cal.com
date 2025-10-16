import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { AvailOfferView } from "~/avail-offer/avail-offer-view";

import { ShellMainAppDir } from "../ShellMainAppDir";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("avail_offer"),
    (t) => t("avail_offer_description"),
    undefined,
    undefined,
    "/avail"
  );
};

const Page = async ({ searchParams: searchParamsProp }: PageProps) => {
  const t = await getTranslate();
  const searchParams = await searchParamsProp;
  const _headers = await headers();
  const _cookies = await cookies();
  const session = await getServerSession({ req: buildLegacyRequest(_headers, _cookies) });
  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  return (
    <ShellMainAppDir
      heading={t("avail_offer")}
      subtitle={t("avail_offer_description")}
      CTA={
        <div className="flex items-center gap-2">
          <button className="transform rounded-md bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 font-medium text-white transition-all duration-200 hover:scale-105 hover:from-blue-600 hover:to-purple-700">
            {t("create_offer")}
          </button>
          <button className="rounded-md bg-gray-100 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
            {t("view_offers")}
          </button>
        </div>
      }>
      <AvailOfferView />
    </ShellMainAppDir>
  );
};

export default Page;
