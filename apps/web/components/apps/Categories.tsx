import Image from "next/image";
import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";

export default function AppStoreCategories(props: any) {
  const { t } = useLocale();
  return (
    <div className="mb-16">
      <h2 className="mb-2 text-lg font-semibold text-gray-900">{t("popular_categories")}</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {props.categories.map((category: any) => (
          <Link key={category.name} href={"/apps/categories/" + category.name}>
            <a className="relative flex rounded-sm bg-gray-100 px-6 py-4 sm:block">
              <div className="min-w-24 -ml-5 text-center sm:ml-0">
                <Image
                  alt={category.name}
                  width="352"
                  height="252"
                  layout="responsive"
                  src={"/app-store/" + category.name + ".svg"}
                />
              </div>
              <div className="self-center">
                <h3 className="font-medium capitalize">{category.name}</h3>
                <p className="text-sm text-gray-500">{category.count} apps</p>
              </div>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}
