import Image from "next/image";
import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { ArrowRight } from "../icon";
import { SkeletonText } from "../skeleton";
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
    <div>
      <Slider
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
            <div className="dark:bg-muted light:bg-[url('/noise.svg')] dark:from-subtle dark:to-muted w-full self-center bg-cover bg-center bg-no-repeat px-6 py-4 dark:bg-gradient-to-tr">
              <Image
                src={"/app-categories/" + category.name + ".svg"}
                width={100}
                height={100}
                alt={category.name}
                className="dark:invert"
              />
              {isLocaleReady ? (
                <h3 className="text-emphasis text-sm font-semibold capitalize">{category.name}</h3>
              ) : (
                <SkeletonText invisible />
              )}
              <p className="text-subtle pt-2 text-sm font-medium">
                {isLocaleReady ? t("number_apps", { count: category.count }) : <SkeletonText invisible />}{" "}
                <ArrowRight className="inline-block h-4 w-4" />
              </p>
            </div>
          </Link>
        )}
      />
    </div>
  );
}
