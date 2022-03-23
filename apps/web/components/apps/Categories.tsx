import { CreditCardIcon } from "@heroicons/react/outline";
import Link from "next/link";

import { useLocale } from "@lib/hooks/useLocale";

export default function AppStoreCategories(props: any) {
  const { t } = useLocale();
  return (
    <div className="mb-16">
      <h2 className="mb-2 text-lg font-semibold text-gray-900">{t("popular_categories")}</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {props.categories.map((category: any) => (
          <Link key={category.name} href={"/apps/categories/" + category.name}>
            <a className="flex rounded-sm bg-gray-100 px-6 py-4">
              <div className="mr-4 flex h-12 w-12 rounded-sm bg-white">
                <CreditCardIcon className="mx-auto h-6 w-6 self-center" />
              </div>
              <div>
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
