import Link from "next/link";
import { ArrowRight } from "react-feather";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AppCategories } from "@calcom/prisma/client";

// TODO: See if it is worth it to move this to the database or not
const categoriesDescription: { [key in AppCategories]: string } = {
  calendar: "Ut ea id veniam commodo sit ad consequat elit ea labore dolore ex tempor nulla.",
  messaging: "Ut ea id veniam commodo sit ad consequat elit ea labore dolore ex tempor nulla.",
  other: "Ut ea id veniam commodo sit ad consequat elit ea labore dolore ex tempor nulla.",
  payment: "Ut ea id veniam commodo sit ad consequat elit ea labore dolore ex tempor nulla.",
  video: "Ut ea id veniam commodo sit ad consequat elit ea labore dolore ex tempor nulla.",
  web3: "Ut ea id veniam commodo sit ad consequat elit ea labore dolore ex tempor nulla.",
};

export default function AppStoreCategories({
  categories,
}: {
  categories: {
    name: AppCategories;
    count: number;
  }[];
}) {
  const { t } = useLocale();
  return (
    <div className="mb-16 mt-14">
      <h2 className="mb-2 text-base font-semibold text-gray-900">{t("featured_categories")}</h2>
      <div className="grid-col-1 grid w-full gap-3 overflow-scroll sm:grid-flow-col">
        {categories.map((category) => (
          <Link key={category.name} href={"/apps/categories/" + category.name}>
            <a
              data-testid={`app-store-category-${category.name}`}
              className="relative flex rounded-sm bg-gray-100 p-6 sm:block">
              <div className="self-center">
                <h3 className="mb-4 font-medium capitalize">{category.name}</h3>
                <p className="mb-4 text-sm font-normal text-gray-600">
                  {categoriesDescription[category.name]}
                </p>
                <p className="inline-block text-sm">{t("number_apps", { count: category.count })}</p>
                <ArrowRight className="ml-[11.33px] inline-block h-4 w-4" />
              </div>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}
