import { CodeIcon, CreditCardIcon, KeyIcon, UserGroupIcon, UserIcon } from "@heroicons/react/solid";

import NavTabs from "./NavTabs";

export default function SettingsShell(props) {
  const tabs = [
    {
      name: "Profile",
      href: "/settings/profile",
      icon: UserIcon,
    },
    {
      name: "Security",
      href: "/settings/security",
      icon: KeyIcon,
    },
    { name: "Embed", href: "/settings/embed", icon: CodeIcon },
    {
      name: "Teams",
      href: "/settings/teams",
      icon: UserGroupIcon,
    },
    {
      name: "Billing",
      href: "/settings/billing",
      icon: CreditCardIcon,
    },
  ];

  return (
    <div>
      <div className="sm:mx-auto">
        <NavTabs tabs={tabs} />
        <hr />
      </div>
      <main className="max-w-4xl">{props.children}</main>
    </div>
  );
}
