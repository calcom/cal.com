import Link from "next/link";
import { ArrowRight } from "react-feather";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import Slider from "./Slider";

export default function AppStoreCategories({
  categories,
}: {
  categories: {
    name: string;
    count: number;
  }[];
}) {
  const { t } = useLocale();
  return (
    <div className="mb-16">
      <Slider
        className="mt-8 mb-16"
        title={t("featured_categories")}
        items={categories}
        itemKey={(category) => category.name}
        options={{
          perView: 5,
          breakpoints: {
            768 /* and below */: {
              perView: 2,
            },
          },
        }}
        renderItem={(category) => (
          <Link key={category.name} href={"/apps/categories/" + category.name}>
            <a
              data-testid={`app-store-category-${category.name}`}
              className="relative flex rounded-sm bg-gray-100 px-6 py-4 sm:block">
              <div className="self-center">
                <h3 className="font-medium capitalize">{category.name}</h3>
                <p className="text-sm text-gray-500">
                  {t("number_apps", { count: category.count })}{" "}
                  <ArrowRight className="inline-block h-4 w-4" />
                </p>
              </div>
            </a>
          </Link>
        )}
      />
    </div>
  );
}
