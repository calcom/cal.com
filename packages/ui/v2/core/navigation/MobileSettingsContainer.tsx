import Link from "next/link";
import { useState } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui";
import Dropdown, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/v2/core/Dropdown";
import { tabs } from "@calcom/ui/v2/core/layouts/SettingsLayout";

const MobileSettingsContainer = () => {
  const [open, setOpen] = useState(false);
  const { t } = useLocale();

  return (
    <nav className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4 lg:hidden">
      <div className=" flex items-center space-x-2 ">
        <a href="/">
          <Icon.FiArrowLeft className="text-gray-700" />
        </a>
        <p className="font-semibold text-black">{t("settings")}</p>
      </div>
      <div className="flex items-center gap-2 self-center">
        <Dropdown open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger className="border hover:bg-gray-300" onClick={() => setOpen(!open)}>
            <Icon.FiMenu />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <div className="w-56 border-gray-100 bg-gray-50 p-4">
              {tabs.map((section) => {
                return (
                  <div key={section.name} className="my-4">
                    <div className="mb-2 flex  items-center space-x-4">
                      <section.icon className="text-gray-500" />
                      <p className="text-gray-600">{t(section.name)}</p>
                    </div>
                    <div className="ml-8 mb-2 ">
                      {section?.children.map((child) => {
                        return (
                          <DropdownMenuItem key={child.name} className="text-gray-900 ">
                            <Link className="w-auto" href={`${WEBAPP_URL}/v2/${child.href}`}>
                              <p className="my-2">{t(child.name)}</p>
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </DropdownMenuContent>
        </Dropdown>
      </div>
    </nav>
  );
};

export default MobileSettingsContainer;
