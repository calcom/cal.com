import Link from "next/link";
import { CreditCardIcon, UserIcon, CodeIcon, KeyIcon, UserGroupIcon } from "@heroicons/react/solid";
import { useRouter } from "next/router";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

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
    <div className="max-w-6xl">
      <div className="min-w-full overflow-scroll sm:mx-auto -mx-4 min-h-16">
        <nav className="-mb-px flex space-x-8 px-4 sm:px-0 " aria-label="Tabs">
          {tabs.map((tab) => (
            <Link key={tab.name} href={tab.href}>
              <a
                className={classNames(
                  tab.current
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
                  "group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm"
                )}
                aria-current={tab.current ? "page" : undefined}>
                <tab.icon
                  className={classNames(
                    tab.current ? "text-neutral-900" : "text-gray-400 group-hover:text-gray-500",
                    "-ml-0.5 mr-2 h-5 w-5"
                  )}
                  aria-hidden="true"
                />
                <span>{tab.name}</span>
              </a>
            </Link>
          ))}
        </nav>
      </div>
      <main>{props.children}</main>
    </div>
  );
}
