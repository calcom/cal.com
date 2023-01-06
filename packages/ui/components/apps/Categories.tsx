import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon, SkeletonText } from "@calcom/ui";

import { Slider } from "./Slider";

export function AppStoreCategories({
  categories,
}: {
  categories: {
    name: string;
    count: number;
  }[];
}) {
  const { t, isLocaleReady } = useLocale();
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
          <Link
            key={category.name}
            href={"/apps/categories/" + category.name}
            data-testid={`app-store-category-${category.name}`}
            className="relative flex rounded-md"
            style={{ background: "radial-gradient(farthest-side at top right, #a2abbe 0%, #E3E3E3 100%)" }}>
            <div className="w-full self-center bg-[url('/noise.svg')] bg-cover bg-center bg-no-repeat px-6 py-4">
              {isLocaleReady ? (
                <h3 className="font-medium capitalize">{category.name}</h3>
              ) : (
                <SkeletonText invisible />
              )}
              <p className="text-sm text-gray-500">
                {isLocaleReady ? t("number_apps", { count: category.count }) : <SkeletonText invisible />}{" "}
                <Icon.FiArrowRight className="inline-block h-4 w-4" />
              </p>
            </div>
          </Link>
        )}
      />
    </div>
  );
}
