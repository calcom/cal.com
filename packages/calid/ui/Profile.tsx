"use client";

import { Avatar } from "@calid/features/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@calid/features/ui/components/dropdown-menu";
import { Icon } from "@calid/features/ui/components/icon";
import { AnimatePresence, motion } from "framer-motion";
import { signOut } from "next-auth/react";
import { useState } from "react";

import { SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";

interface ProfileProps {
  small?: boolean;
}

export const Profile = ({ small }: ProfileProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHelpOptions, setShowHelpOptions] = useState(false);
  const { t } = useLocale();
  const { data: user, isPending } = useMeQuery();

  // Stop the dropdown from rendering if the user is not available.
  if (!user && !isPending) {
    return null;
  }

  const handleHelpClick = (action: string) => {
    switch (action) {
      case "docs":
        window.open("https://chat.onehash.ai/hc/onehash-help-center/en/categories/onehash-cal", "_blank");
        break;
      case "contact":
        window.location.href = `mailto:${SUPPORT_MAIL_ADDRESS}`;
        break;
    }
  };

  return (
    <DropdownMenu
      open={menuOpen}
      disabled={isPending}
      onOpenChange={(isOpen) => {
        setMenuOpen(isOpen);
        if (!isOpen) {
          setShowHelpOptions(false);
        }
      }}>
      <DropdownMenuTrigger asChild>
        <button className="hover:bg-emphasis flex hidden w-auto items-center space-x-3 rounded-lg px-2 py-1.5 transition-colors md:flex">
          <div className="bg-primary flex h-6 w-6 items-center justify-center rounded-full">
            <span className="text-primary-foreground text-xs font-medium">
              <Avatar
                size={small ? "xs" : "xsm"}
                imageSrc={user?.avatarUrl ?? user?.avatar}
                alt={user?.username ? `${user.username} Avatar` : "Nameless User Avatar"}
                className="overflow-hidden"
              />
            </span>
          </div>
          {!small && (
            <span className="flex flex-grow items-center gap-2">
              <span className="w-24 flex-shrink-0 text-sm leading-none">
                <span className="text-emphasis block truncate py-0.5 font-medium leading-normal">
                  {isPending ? "Loading..." : user?.name ?? "Nameless User"}
                </span>
              </span>
            </span>
          )}
          <Icon
            name="chevron-down"
            className={`ml-auto h-4 w-4 transition-transform ${menuOpen ? "rotate-180" : ""}`}
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="bottom" align="end" className="w-48">
        <DropdownMenuItem onClick={() => (window.location.href = "/settings/my-account/profile")}>
          <Icon name="user" className="mr-2 h-4 w-4" />
          {t("my_profile")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => (window.location.href = "/settings/my-account/out-of-office")}>
          <Icon name="moon" className="mr-2 h-4 w-4" />
          {t("out_of_office")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open(`${window.location.origin}/?from=app`, "_blank")}>
          <Icon name="globe" className="mr-2 h-4 w-4" />
          {t("go_to_website")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => window.open(`${window.location.origin}/${user?.username}`, "_blank")}>
          <Icon name="external-link" className="mr-2 h-4 w-4" />
          {t("view_public_page")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open("https://roadmap.cal.id/", "_blank")}>
          <Icon name="map-pin" className="mr-2 h-4 w-4" />
          {t("visit_roadmap")}
        </DropdownMenuItem>
        <div
          onClick={(e) => {
            e.stopPropagation(); // <-- Prevent menu from closing
            setShowHelpOptions((prev) => !prev);
          }}
          className="hover:bg-emphasis flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm">
          <Icon name="circle-help" className="mr-2 h-4 w-4" />
          {t("help")}
          <Icon
            name="chevron-down"
            className={`ml-auto h-4 w-4 transition-transform ${showHelpOptions ? "rotate-180" : ""}`}
          />
        </div>
        <AnimatePresence initial={false}>
          {showHelpOptions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}>
              <DropdownMenuItem onClick={() => handleHelpClick("docs")}>
                <Icon name="file" className="mr-2 h-4 w-4" />
                {t("documentation")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleHelpClick("contact")}>
                <Icon name="mail" className="mr-2 h-4 w-4" />
                {t("contact")}
              </DropdownMenuItem>
            </motion.div>
          )}
        </AnimatePresence>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => (window.location.href = "/settings/my-account/profile")}>
          <Icon name="settings" className="mr-2 h-4 w-4" />
          {t("settings")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/auth/logout" })} color="destructive">
          <Icon name="log-out" className=" mr-2 h-4 w-4" />
          {t("sign_out")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
