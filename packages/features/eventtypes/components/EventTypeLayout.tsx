import { useMemo, useState, Suspense } from "react";
import type { UseFormReturn } from "react-hook-form";

import { Shell as PlatformShell } from "@calcom/atoms/monorepo";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { EventTypeEmbedButton, EventTypeEmbedDialog } from "@calcom/features/embed/EventTypeEmbed";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import WebShell from "@calcom/features/shell/Shell";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";
import type { VerticalTabItemProps } from "@calcom/ui";
import {
  Button,
  ButtonGroup,
  DropdownMenuSeparator,
  Dropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownItem,
  DropdownMenuTrigger,
  HorizontalTabs,
  Label,
  Icon,
  showToast,
  Skeleton,
  Switch,
  Tooltip,
  VerticalDivider,
  VerticalTabs,
} from "@calcom/ui";

import { DeleteDialog } from "./dialogs/DeleteDialog";

type Props = {
  children: React.ReactNode;
  eventType: EventTypeSetupProps["eventType"];
  currentUserMembership: EventTypeSetupProps["currentUserMembership"];
  team: EventTypeSetupProps["team"];
  disableBorder?: boolean;
  formMethods: UseFormReturn<FormValues>;
  isUpdateMutationLoading?: boolean;
  isUserOrganizationAdmin: boolean;
  bookerUrl: string;
  onDelete: (id: number) => void;
  isDeleting?: boolean;
  isPlatform?: boolean;
  tabsNavigation: VerticalTabItemProps[];
};

function EventTypeSingleLayout({
  children,
  eventType,
  currentUserMembership,
  team,
  disableBorder,
  isUpdateMutationLoading,
  formMethods,
  isUserOrganizationAdmin,
  bookerUrl,
  onDelete,
  isDeleting,
  isPlatform,
  tabsNavigation,
}: Props) {
  const { t } = useLocale();
  const eventTypesLockedByOrg = eventType.team?.parent?.organizationSettings?.lockEventTypeCreationForUsers;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const hasPermsToDelete =
    currentUserMembership?.role !== "MEMBER" ||
    !currentUserMembership ||
    formMethods.getValues("schedulingType") === SchedulingType.MANAGED ||
    isUserOrganizationAdmin;

  const { isManagedEventType, isChildrenManagedEventType } = useLockedFieldsManager({
    eventType,
    translate: t,
    formMethods,
  });
  const EventTypeTabs = tabsNavigation;
  const permalink = `${bookerUrl}/${
    team ? `${!team.parentId ? "team/" : ""}${team.slug}` : formMethods.getValues("users")[0].username
  }/${eventType.slug}`;

  const embedLink = `${
    team ? `team/${team.slug}` : formMethods.getValues("users")[0].username
  }/${formMethods.getValues("slug")}`;
  const isManagedEvent = formMethods.getValues("schedulingType") === SchedulingType.MANAGED ? "_managed" : "";

  const [Shell] = useMemo(() => {
    return isPlatform ? [PlatformShell] : [WebShell];
  }, [isPlatform]);

  return (
    <Shell
      backPath="/event-types"
      title={`${eventType.title} | ${t("event_type")}`}
      heading={eventType.title}
      CTA={
        <div className="flex items-center justify-end">
          {!formMethods.getValues("metadata")?.managedEventConfig && (
            <>
              <div
                className={classNames(
                  "sm:hover:bg-muted hidden cursor-pointer items-center rounded-md transition",
                  formMethods.watch("hidden") ? "pl-2" : "",
                  "lg:flex"
                )}>
                {formMethods.watch("hidden") && (
                  <Skeleton
                    as={Label}
                    htmlFor="hiddenSwitch"
                    className="mt-2 hidden cursor-pointer self-center whitespace-nowrap pr-2 sm:inline">
                    {t("hidden")}
                  </Skeleton>
                )}
                <Tooltip
                  sideOffset={4}
                  content={
                    formMethods.watch("hidden") ? t("show_eventtype_on_profile") : t("hide_from_profile")
                  }
                  side="bottom">
                  <div className="self-center rounded-md p-2">
                    <Switch
                      id="hiddenSwitch"
                      disabled={eventTypesLockedByOrg}
                      checked={!formMethods.watch("hidden")}
                      onCheckedChange={(e) => {
                        formMethods.setValue("hidden", !e, { shouldDirty: true });
                      }}
                    />
                  </div>
                </Tooltip>
              </div>
              <VerticalDivider className="hidden lg:block" />
            </>
          )}

          {/* TODO: Figure out why combined isnt working - works in storybook */}
          <ButtonGroup combined containerProps={{ className: "border-default hidden lg:flex" }}>
            {!isManagedEventType && (
              <>
                {/* We have to warp this in tooltip as it has a href which disabels the tooltip on buttons */}
                {!isPlatform && (
                  <Tooltip content={t("preview")} side="bottom" sideOffset={4}>
                    <Button
                      color="secondary"
                      data-testid="preview-button"
                      target="_blank"
                      variant="icon"
                      href={permalink}
                      rel="noreferrer"
                      StartIcon="external-link"
                    />
                  </Tooltip>
                )}

                {!isPlatform && (
                  <Button
                    color="secondary"
                    variant="icon"
                    StartIcon="link"
                    tooltip={t("copy_link")}
                    tooltipSide="bottom"
                    tooltipOffset={4}
                    onClick={() => {
                      navigator.clipboard.writeText(permalink);
                      showToast("Link copied!", "success");
                    }}
                  />
                )}
                {!isPlatform && (
                  <EventTypeEmbedButton
                    embedUrl={encodeURIComponent(embedLink)}
                    StartIcon="code"
                    color="secondary"
                    variant="icon"
                    namespace={eventType.slug}
                    tooltip={t("embed")}
                    tooltipSide="bottom"
                    tooltipOffset={4}
                    eventId={formMethods.getValues("id")}
                  />
                )}
              </>
            )}
            {!isChildrenManagedEventType && (
              <Button
                color="destructive"
                variant="icon"
                StartIcon="trash"
                tooltip={t("delete")}
                tooltipSide="bottom"
                tooltipOffset={4}
                disabled={!hasPermsToDelete}
                onClick={() => setDeleteDialogOpen(true)}
              />
            )}
          </ButtonGroup>

          <VerticalDivider className="hidden lg:block" />

          <Dropdown>
            <DropdownMenuTrigger asChild>
              <Button className="lg:hidden" StartIcon="ellipsis" variant="icon" color="secondary" />
            </DropdownMenuTrigger>
            <DropdownMenuContent style={{ minWidth: "200px" }}>
              <DropdownMenuItem className="focus:ring-muted">
                <DropdownItem
                  target="_blank"
                  type="button"
                  StartIcon="external-link"
                  href={permalink}
                  rel="noreferrer">
                  {t("preview")}
                </DropdownItem>
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:ring-muted">
                <DropdownItem
                  type="button"
                  StartIcon="link"
                  onClick={() => {
                    navigator.clipboard.writeText(permalink);
                    showToast("Link copied!", "success");
                  }}>
                  {t("copy_link")}
                </DropdownItem>
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:ring-muted">
                <DropdownItem
                  type="button"
                  color="destructive"
                  StartIcon="trash"
                  disabled={!hasPermsToDelete}
                  onClick={() => setDeleteDialogOpen(true)}>
                  {t("delete")}
                </DropdownItem>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="hover:bg-subtle flex h-9 cursor-pointer flex-row items-center justify-between px-4 py-2 transition">
                <Skeleton
                  as={Label}
                  htmlFor="hiddenSwitch"
                  className="mt-2 inline cursor-pointer self-center pr-2 ">
                  {formMethods.watch("hidden") ? t("show_eventtype_on_profile") : t("hide_from_profile")}
                </Skeleton>
                <Switch
                  id="hiddenSwitch"
                  checked={!formMethods.watch("hidden")}
                  onCheckedChange={(e) => {
                    formMethods.setValue("hidden", !e, { shouldDirty: true });
                  }}
                />
              </div>
            </DropdownMenuContent>
          </Dropdown>
          <div className="border-default border-l-2" />
          <Button
            className="ml-4 lg:ml-0"
            type="submit"
            loading={isUpdateMutationLoading}
            disabled={!formMethods.formState.isDirty}
            data-testid="update-eventtype"
            form="event-type-form">
            {t("save")}
          </Button>
        </div>
      }>
      <Suspense fallback={<Icon name="loader" />}>
        <div className="flex flex-col xl:flex-row xl:space-x-6">
          <div className="hidden xl:block">
            <VerticalTabs
              className="primary-navigation"
              tabs={EventTypeTabs}
              sticky
              linkShallow
              itemClassname="items-start"
            />
          </div>
          <div className="p-2 md:mx-0 md:p-0 xl:hidden">
            <HorizontalTabs tabs={EventTypeTabs} linkShallow />
          </div>
          <div className="w-full ltr:mr-2 rtl:ml-2">
            <div
              className={classNames(
                "bg-default border-subtle  mt-4 rounded-md sm:mx-0 xl:mt-0",
                disableBorder ? "border-0 " : "p-2 md:border md:p-6"
              )}>
              {children}
            </div>
          </div>
        </div>
      </Suspense>
      <DeleteDialog
        eventTypeId={eventType.id}
        isManagedEvent={isManagedEvent}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDelete={onDelete}
        isDeleting={isDeleting}
      />

      {!isPlatform && <EventTypeEmbedDialog />}
    </Shell>
  );
}

export { EventTypeSingleLayout };
