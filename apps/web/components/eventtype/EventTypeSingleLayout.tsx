import type { TFunction } from "next-i18next";
import { Trans } from "next-i18next";
import { useRouter } from "next/navigation";
import type { EventTypeSetupProps } from "pages/event-types/[type]";
import { useMemo, useState, Suspense } from "react";
import type { UseFormReturn } from "react-hook-form";

import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { EventTypeEmbedButton, EventTypeEmbedDialog } from "@calcom/features/embed/EventTypeEmbed";
import type { FormValues, AvailabilityOption } from "@calcom/features/eventtypes/lib/types";
import Shell from "@calcom/features/shell/Shell";
import { classNames } from "@calcom/lib";
import getPaymentAppData from "@calcom/lib/getPaymentAppData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { SchedulingType } from "@calcom/prisma/enums";
import { trpc, TRPCClientError } from "@calcom/trpc/react";
import type { DialogProps, VerticalTabItemProps } from "@calcom/ui";
import {
  Button,
  ButtonGroup,
  ConfirmationDialogContent,
  Dialog,
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

type Props = {
  children: React.ReactNode;
  eventType: EventTypeSetupProps["eventType"];
  currentUserMembership: EventTypeSetupProps["currentUserMembership"];
  team: EventTypeSetupProps["team"];
  disableBorder?: boolean;
  enabledAppsNumber: number;
  installedAppsNumber: number;
  enabledWorkflowsNumber: number;
  formMethods: UseFormReturn<FormValues>;
  isUpdateMutationLoading?: boolean;
  availability?: AvailabilityOption;
  isUserOrganizationAdmin: boolean;
  bookerUrl: string;
  activeWebhooksNumber: number;
};

type getNavigationProps = {
  t: TFunction;
  length: number;
  id: number;
  multipleDuration?: EventTypeSetupProps["eventType"]["metadata"]["multipleDuration"];
  enabledAppsNumber: number;
  enabledWorkflowsNumber: number;
  installedAppsNumber: number;
  availability: AvailabilityOption | undefined;
};

function getNavigation({
  length,
  id,
  multipleDuration,
  t,
  enabledAppsNumber,
  installedAppsNumber,
  enabledWorkflowsNumber,
}: getNavigationProps) {
  const duration = multipleDuration?.map((duration) => ` ${duration}`) || length;

  return [
    {
      name: "event_setup_tab_title",
      href: `/event-types/${id}?tabName=setup`,
      icon: "link",
      info: `${duration} ${t("minute_timeUnit")}`, // TODO: Get this from props
    },
    {
      name: "event_limit_tab_title",
      href: `/event-types/${id}?tabName=limits`,
      icon: "clock",
      info: `event_limit_tab_description`,
    },
    {
      name: "event_advanced_tab_title",
      href: `/event-types/${id}?tabName=advanced`,
      icon: "sliders-vertical",
      info: `event_advanced_tab_description`,
    },
    {
      name: "apps",
      href: `/event-types/${id}?tabName=apps`,
      icon: "grid-3x3",
      //TODO: Handle proper translation with count handling
      info: `${installedAppsNumber} apps, ${enabledAppsNumber} ${t("active")}`,
    },
    {
      name: "workflows",
      href: `/event-types/${id}?tabName=workflows`,
      icon: "zap",
      info: `${enabledWorkflowsNumber} ${t("active")}`,
    },
  ] satisfies VerticalTabItemProps[];
}

function DeleteDialog({
  isManagedEvent,
  eventTypeId,
  open,
  onOpenChange,
}: { isManagedEvent: string; eventTypeId: number } & Pick<DialogProps, "open" | "onOpenChange">) {
  const utils = trpc.useUtils();
  const { t } = useLocale();
  const router = useRouter();
  const deleteMutation = trpc.viewer.eventTypes.delete.useMutation({
    onSuccess: async () => {
      await utils.viewer.eventTypes.invalidate();
      showToast(t("event_type_deleted_successfully"), "success");
      router.push("/event-types");
      onOpenChange?.(false);
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
        onOpenChange?.(false);
      } else if (err instanceof TRPCClientError) {
        showToast(err.message, "error");
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ConfirmationDialogContent
        isPending={deleteMutation.isPending}
        variety="danger"
        title={t(`delete${isManagedEvent}_event_type`)}
        confirmBtnText={t(`confirm_delete_event_type`)}
        loadingText={t(`confirm_delete_event_type`)}
        onConfirm={(e) => {
          e.preventDefault();
          deleteMutation.mutate({ id: eventTypeId });
        }}>
        <p className="mt-5">
          <Trans
            i18nKey={`delete${isManagedEvent}_event_type_description`}
            components={{ li: <li />, ul: <ul className="ml-4 list-disc" /> }}>
            <ul>
              <li>Members assigned to this event type will also have their event types deleted.</li>
              <li>Anyone who they&apos;ve shared their link with will no longer be able to book using it.</li>
            </ul>
          </Trans>
        </p>
      </ConfirmationDialogContent>
    </Dialog>
  );
}

function EventTypeSingleLayout({
  children,
  eventType,
  currentUserMembership,
  team,
  disableBorder,
  enabledAppsNumber,
  installedAppsNumber,
  enabledWorkflowsNumber,
  isUpdateMutationLoading,
  formMethods,
  availability,
  isUserOrganizationAdmin,
  bookerUrl,
  activeWebhooksNumber,
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

  const length = formMethods.watch("length");
  const multipleDuration = formMethods.watch("metadata")?.multipleDuration;

  const watchSchedulingType = formMethods.watch("schedulingType");
  const watchChildrenCount = formMethods.watch("children").length;

  const paymentAppData = getPaymentAppData(eventType);
  const requirePayment = paymentAppData.price > 0;

  // Define tab navigation here
  const EventTypeTabs = useMemo(() => {
    const navigation: VerticalTabItemProps[] = getNavigation({
      t,
      length,
      multipleDuration,
      id: formMethods.getValues("id"),
      enabledAppsNumber,
      installedAppsNumber,
      enabledWorkflowsNumber,
      availability,
    });

    if (!requirePayment) {
      navigation.splice(3, 0, {
        name: "recurring",
        href: `/event-types/${formMethods.getValues("id")}?tabName=recurring`,
        icon: "repeat",
        info: `recurring_event_tab_description`,
      });
    }
    navigation.splice(1, 0, {
      name: "availability",
      href: `/event-types/${formMethods.getValues("id")}?tabName=availability`,
      icon: "calendar",
      info:
        isManagedEventType || isChildrenManagedEventType
          ? formMethods.getValues("schedule") === null
            ? "members_default_schedule"
            : isChildrenManagedEventType
            ? `${
                formMethods.getValues("scheduleName")
                  ? `${formMethods.getValues("scheduleName")} - ${t("managed")}`
                  : `default_schedule_name`
              }`
            : formMethods.getValues("scheduleName") ?? `default_schedule_name`
          : formMethods.getValues("scheduleName") ?? `default_schedule_name`,
    });
    // If there is a team put this navigation item within the tabs
    if (team) {
      navigation.splice(2, 0, {
        name: "assignment",
        href: `/event-types/${formMethods.getValues("id")}?tabName=team`,
        icon: "users",
        info: `${t(watchSchedulingType?.toLowerCase() ?? "")}${
          isManagedEventType ? ` - ${t("number_member", { count: watchChildrenCount || 0 })}` : ""
        }`,
      });
    }
    const showWebhooks = !(isManagedEventType || isChildrenManagedEventType);
    if (showWebhooks) {
      if (team) {
        navigation.push({
          name: "instant_tab_title",
          href: `/event-types/${eventType.id}?tabName=instant`,
          icon: "phone-call",
          info: `instant_event_tab_description`,
        });
      }
      navigation.push({
        name: "webhooks",
        href: `/event-types/${formMethods.getValues("id")}?tabName=webhooks`,
        icon: "webhook",
        info: `${activeWebhooksNumber} ${t("active")}`,
      });
    }
    const hidden = true; // hidden while in alpha trial. you can access it with tabName=ai
    if (team && hidden) {
      navigation.push({
        name: "Cal.ai",
        href: `/event-types/${eventType.id}?tabName=ai`,
        icon: "sparkles",
        info: "cal_ai_event_tab_description", // todo `cal_ai_event_tab_description`,
      });
    }
    return navigation;
  }, [
    t,
    enabledAppsNumber,
    installedAppsNumber,
    enabledWorkflowsNumber,
    availability,
    isManagedEventType,
    isChildrenManagedEventType,
    team,
    length,
    requirePayment,
    multipleDuration,
    formMethods.getValues("id"),
    watchSchedulingType,
    watchChildrenCount,
    activeWebhooksNumber,
  ]);

  const permalink = `${bookerUrl}/${
    team ? `${!team.parentId ? "team/" : ""}${team.slug}` : formMethods.getValues("users")[0].username
  }/${eventType.slug}`;

  const embedLink = `${
    team ? `team/${team.slug}` : formMethods.getValues("users")[0].username
  }/${formMethods.getValues("slug")}`;
  const isManagedEvent = formMethods.getValues("schedulingType") === SchedulingType.MANAGED ? "_managed" : "";
  // const title = formMethods.watch("title");
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
                  "sm:hover:bg-muted hidden cursor-pointer items-center rounded-md",
                  formMethods.watch("hidden") ? "px-2" : "",
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
                <EventTypeEmbedButton
                  embedUrl={encodeURIComponent(embedLink)}
                  StartIcon="code"
                  color="secondary"
                  variant="icon"
                  namespace=""
                  tooltip={t("embed")}
                  tooltipSide="bottom"
                  tooltipOffset={4}
                  eventId={formMethods.getValues("id")}
                />
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
              <div className="hover:bg-subtle flex h-9 cursor-pointer flex-row items-center justify-between px-4 py-2">
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
      />

      <EventTypeEmbedDialog />
    </Shell>
  );
}

export { EventTypeSingleLayout };
