"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Avatar, AvatarFallback, AvatarImage } from "@coss/ui/components/avatar";
import { Button } from "@coss/ui/components/button";
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuTrigger } from "@coss/ui/components/menu";
import { ChevronDownIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const CreateNewWebhookButton = ({ isEmptyState }: { isEmptyState?: boolean }) => {
  const router = useRouter();
  const { t } = useLocale();

  const query = trpc.viewer.loggedInViewerRouter.teamsAndUserProfilesQuery.useQuery({
    includeOrg: true,
    withPermission: {
      permission: "webhook.create",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    },
  });

  if (!query.data) return null;

  const options = query.data
    .filter((profile) => !profile.readOnly)
    .map((profile) => ({
      teamId: profile.teamId,
      label: profile.name || profile.slug,
      image: profile.image,
      slug: profile.slug,
    }));

  const handleSelect = (option: { teamId?: number | null; platform?: boolean }) => {
    if (option.platform) {
      router.push(`webhooks/new?platform=${option.platform}`);
    } else {
      router.push(`webhooks/new${option.teamId ? `?teamId=${option.teamId}` : ""}`);
    }
  };

  if (options.length <= 1) {
    return (
      <Button
        data-testid="new_webhook"
        onClick={() => handleSelect(options[0] || {})}
        variant={isEmptyState ? "default" : "outline"}>
        <PlusIcon aria-hidden="true" />
        {t("new")}
      </Button>
    );
  }

  return (
    <Menu>
      <MenuTrigger
        render={<Button data-testid="new_webhook" variant={isEmptyState ? "default" : "outline"} />}>
        {t("new")}
        <ChevronDownIcon aria-hidden="true" />
      </MenuTrigger>
      <MenuPopup align={isEmptyState ? undefined : "end"}>
        <MenuGroup>
          <MenuGroupLabel>{t("create_for")}</MenuGroupLabel>
          {options.map((option, idx) => (
            <MenuItem
              key={option.label}
              data-testid={`option${option.teamId ? "-team" : ""}-${idx}`}
              onClick={() => handleSelect(option)}>
              <span className="flex items-center gap-2">
                <Avatar className="size-5">
                  {option.image ? <AvatarImage alt={option.label || ""} src={option.image} /> : null}
                  <AvatarFallback className="text-[.625rem]">
                    {getInitials(option.label || "")}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{option.label}</span>
              </span>
            </MenuItem>
          ))}
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
};

export default CreateNewWebhookButton;
