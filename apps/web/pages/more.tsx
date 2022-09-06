import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/Icon";
import { navigation } from "@calcom/ui/Shell";
import { Shell } from "@calcom/ui/v2";

export default function MorePage() {
  const { t } = useLocale();
  return (
    <Shell>
      <div className="max-w-screen-lg">
        <ul className="mt-2 rounded-md border">
          {navigation.map(
            (item) =>
              item.more && (
                <li className="border-b last:border-b-0" key={item.name}>
                  <Link href={item.href}>
                    <a className="flex items-center justify-between p-5 hover:bg-gray-100">
                      <span className="flex items-center font-semibold text-gray-700 ">
                        {item.icon && (
                          <item.icon
                            className="h-5 w-5 flex-shrink-0  ltr:mr-3 rtl:ml-3"
                            aria-hidden="true"
                          />
                        )}
                        {t(item.name)}
                      </span>
                      <Icon.FiArrowRight className="h-5 w-5 text-gray-500" />
                    </a>
                  </Link>
                </li>
              )
          )}
        </ul>

        <p className="mt-6 text-xs leading-tight text-gray-500 md:hidden">
          We view the mobile application as an extension of the web application. If you are performing any
          complication actions, please refer back to the web application.
        </p>
      </div>
    </Shell>
  );
}
