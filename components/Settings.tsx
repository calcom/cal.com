import Link from "next/link";
import { CodeIcon, CreditCardIcon, KeyIcon, UserGroupIcon, UserIcon } from "@heroicons/react/solid";
import { useRouter } from "next/router";
import classNames from "@lib/classNames";

export default function SettingsShell(props) {
  const router = useRouter();

  const tabs = [
    {
      name: "Profile",
      href: "/settings/profile",
      icon: UserIcon,
      current: router.pathname == "/settings/profile",
    },
    {
      name: "Password",
      href: "/settings/password",
      icon: KeyIcon,
      current: router.pathname == "/settings/password",
    },
    { name: "Embed", href: "/settings/embed", icon: CodeIcon, current: router.pathname == "/settings/embed" },
    {
      name: "Teams",
      href: "/settings/teams",
      icon: UserGroupIcon,
      current: router.pathname == "/settings/teams",
    },
    {
      name: "Billing",
      href: "/settings/billing",
      icon: CreditCardIcon,
      current: router.pathname == "/settings/billing",
    },
  ];

  return (
    <div>
      <div className="sm:mx-auto">
        <nav className="flex -mb-px space-x-2 sm:space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <Link key={tab.name} href={tab.href}>
              <a
                className={classNames(
                  tab.current
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
                  "group inline-flex items-center px-1 py-4 text-sm font-medium border-b-2"
                )}
                aria-current={tab.current ? "page" : undefined}>
                <tab.icon
                  className={classNames(
                    tab.current ? "text-neutral-900" : "text-gray-400 group-hover:text-gray-500",
                    "hidden -ml-0.5 mr-2 w-5 h-5 sm:inline-block"
                  )}
                  aria-hidden="true"
                />
                <span>{tab.name}</span>
              </a>
            </Link>
          ))}
        </nav>
        <hr />
      </div>
      <main className="max-w-4xl">{props.children}</main>
    </div>
  );
}
