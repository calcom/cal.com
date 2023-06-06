import { Webhook as TbWebhook } from "lucide-react";
import type { TFunction } from "next-i18next";
import { Trans } from "next-i18next";
import { useRouter } from "next/router";
import type { EventTypeSetupProps, FormValues } from "pages/event-types/[type]";
import { useMemo, useState, Suspense } from "react";
import type { UseFormReturn } from "react-hook-form";

import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import Shell from "@calcom/features/shell/Shell";
import { classNames } from "@calcom/lib";
import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { SchedulingType } from "@calcom/prisma/enums";
import { trpc, TRPCClientError } from "@calcom/trpc/react";
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
  showToast,
  Skeleton,
  Switch,
  Tooltip,
  VerticalDivider,
  VerticalTabs,
} from "@calcom/ui";
import {
  Link as LinkIcon,
  Calendar,
  Clock,
  Sliders,
  Repeat,
  Grid,
  Zap,
  Users,
  ExternalLink,
  Code,
  Trash,
  MoreHorizontal,
  Loader,
} from "@calcom/ui/components/icon";

import { EmbedButton, EmbedDialog } from "@components/Embed";
import type { AvailabilityOption } from "@components/eventtype/EventAvailabilityTab";

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
};

function getNavigation(props: {
  t: TFunction;
  eventType: Props["eventType"];
  enabledAppsNumber: number;
  enabledWorkflowsNumber: number;
  installedAppsNumber: number;
  availability: AvailabilityOption | undefined;
}) {
  const { eventType, t, enabledAppsNumber, installedAppsNumber, enabledWorkflowsNumber, availability } =
    props;
  const duration =
    eventType.metadata?.multipleDuration?.map((duration) => ` ${duration}`) || eventType.length;

  return [
    {
      name: "event_setup_tab_title",
      href: `/event-types/${eventType.id}?tabName=setup`,
      icon: LinkIcon,
      info: `${duration} ${t("minute_timeUnit")}`, // TODO: Get this from props
    },
    {
      name: "event_limit_tab_title",
      href: `/event-types/${eventType.id}?tabName=limits`,
      icon: Clock,
      info: `event_limit_tab_description`,
    },
    {
      name: "event_advanced_tab_title",
      href: `/event-types/${eventType.id}?tabName=advanced`,
      icon: Sliders,
      info: `event_advanced_tab_description`,
    },
    {
      name: "recurring",
      href: `/event-types/${eventType.id}?tabName=recurring`,
      icon: Repeat,
      info: `recurring_event_tab_description`,
    },
    {
      name: "apps",
      href: `/event-types/${eventType.id}?tabName=apps`,
      icon: Grid,
      //TODO: Handle proper translation with count handling
      info: `${installedAppsNumber} apps, ${enabledAppsNumber} ${t("active")}`,
    },
    {
      name: "workflows",
      href: `/event-types/${eventType.id}?tabName=workflows`,
      icon: Zap,
      info: `${enabledWorkflowsNumber} ${t("active")}`,
    },
  ];
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
}: Props) {
  const utils = trpc.useContext();
  const { t } = useLocale();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const hasPermsToDelete =
    currentUserMembership?.role !== "MEMBER" ||
    !currentUserMembership ||
    eventType.schedulingType === SchedulingType.MANAGED;

  const deleteMutation = trpc.viewer.eventTypes.delete.useMutation({
    onSuccess: async () => {
      await utils.viewer.eventTypes.invalidate();
      showToast(t("event_type_deleted_successfully"), "success");
      await router.push("/event-types");
      setDeleteDialogOpen(false);
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
        setDeleteDialogOpen(false);
      } else if (err instanceof TRPCClientError) {
        showToast(err.message, "error");
      }
    },
  });

  const { isManagedEventType, isChildrenManagedEventType } = useLockedFieldsManager(
    eventType,
    t("locked_fields_admin_description"),
    t("locked_fields_member_description")
  );

  // Define tab navigation here
  const EventTypeTabs = useMemo(() => {
    const navigation = getNavigation({
      t,
      eventType,
      enabledAppsNumber,
      installedAppsNumber,
      enabledWorkflowsNumber,
      availability,
    });

    navigation.splice(1, 0, {
      name: "availability",
      href: `/event-types/${eventType.id}?tabName=availability`,
      icon: Calendar,
      info:
        isManagedEventType || isChildrenManagedEventType
          ? eventType.schedule === null
            ? "member_default_schedule"
            : isChildrenManagedEventType
            ? `${
                eventType.scheduleName
                  ? `${eventType.scheduleName} - ${t("managed")}`
                  : `default_schedule_name`
              }`
            : eventType.scheduleName ?? `default_schedule_name`
          : eventType.scheduleName ?? `default_schedule_name`,
    });
    // If there is a team put this navigation item within the tabs
    if (team) {
      navigation.splice(2, 0, {
        name: "assignment",
        href: `/event-types/${eventType.id}?tabName=team`,
        icon: Users,
        info: `${t(eventType.schedulingType?.toLowerCase() ?? "")}${
          isManagedEventType
            ? ` - ${t("count_members", { count: formMethods.watch("children").length || 0 })}`
            : ""
        }`,
      });
    }
    if (isManagedEventType || isChildrenManagedEventType) {
      // Removing apps and workflows for manageg event types by admins v1
      navigation.splice(-2, 1);
    } else {
      navigation.push({
        name: "webhooks",
        href: `/event-types/${eventType.id}?tabName=webhooks`,
        icon: TbWebhook,
        info: `${eventType.webhooks.filter((webhook) => webhook.active).length} ${t("active")}`,
      });
    }
    return navigation;
  }, [t, eventType, installedAppsNumber, enabledAppsNumber, enabledWorkflowsNumber, team, availability]);

  const permalink = `${CAL_URL}/${team ? `team/${team.slug}` : eventType.users[0].username}/${
    eventType.slug
  }`;

  const embedLink = `${team ? `team/${team.slug}` : eventType.users[0].username}/${eventType.slug}`;
  const isManagedEvent = eventType.schedulingType === SchedulingType.MANAGED ? "_managed" : "";

  return (
    <Shell
      backPath="/event-types"
      title={eventType.title + " | " + t("event_type")}
      heading={eventType.title}
      CTA={
        <div className="flex items-center justify-end">
          {!eventType.metadata.managedEventConfig && (
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
                  content={
                    formMethods.watch("hidden") ? t("show_eventtype_on_profile") : t("hide_from_profile")
                  }>
                  <div className="self-center rounded-md p-2">
                    <Switch
                      id="hiddenSwitch"
                      checked={!formMethods.watch("hidden")}
                      onCheckedChange={(e) => {
                        formMethods.setValue("hidden", !e);
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
                <Tooltip content={t("preview")}>
                  <Button
                    color="secondary"
                    data-testid="preview-button"
                    target="_blank"
                    variant="icon"
                    href={permalink}
                    rel="noreferrer"
                    StartIcon={ExternalLink}
                  />
                </Tooltip>

                <Button
                  color="secondary"
                  variant="icon"
                  StartIcon={LinkIcon}
                  tooltip={t("copy_link")}
                  onClick={() => {
                    navigator.clipboard.writeText(permalink);
                    showToast("Link copied!", "success");
                  }}
                />
                <EmbedButton
                  embedUrl={encodeURIComponent(embedLink)}
                  StartIcon={Code}
                  color="secondary"
                  variant="icon"
                  tooltip={t("embed")}
                />
              </>
            )}
            {!isChildrenManagedEventType && (
              <Button
                color="destructive"
                variant="icon"
                StartIcon={Trash}
                tooltip={t("delete")}
                disabled={!hasPermsToDelete}
                onClick={() => setDeleteDialogOpen(true)}
              />
            )}
          </ButtonGroup>

          <VerticalDivider className="hidden lg:block" />

          <Dropdown>
            <DropdownMenuTrigger asChild>
              <Button className="lg:hidden" StartIcon={MoreHorizontal} variant="icon" color="secondary" />
            </DropdownMenuTrigger>
            <DropdownMenuContent style={{ minWidth: "200px" }}>
              <DropdownMenuItem className="focus:ring-muted">
                <DropdownItem
                  target="_blank"
                  type="button"
                  StartIcon={ExternalLink}
                  href={permalink}
                  rel="noreferrer">
                  {t("preview")}
                </DropdownItem>
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:ring-muted">
                <DropdownItem
                  type="button"
                  StartIcon={LinkIcon}
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
                  StartIcon={Trash}
                  disabled={!hasPermsToDelete}
                  onClick={() => setDeleteDialogOpen(true)}>
                  {t("delete")}
                </DropdownItem>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="hover:bg-subtle flex h-9 cursor-pointer flex-row items-center justify-between py-2 px-4">
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
                    formMethods.setValue("hidden", !e);
                  }}
                />
              </div>
            </DropdownMenuContent>
          </Dropdown>
          <div className="border-default border-l-2" />
          <Button
            className="ml-4 lg:ml-0"
            type="submit"
            loading={formMethods.formState.isSubmitting || isUpdateMutationLoading}
            data-testid="update-eventtype"
            form="event-type-form">
            {t("save")}
          </Button>
        </div>
      }>
      <Suspense fallback={<Loader />}>
        <div className="flex flex-col xl:flex-row xl:space-x-6">
          <div className="hidden xl:block">
            <VerticalTabs
              className="primary-navigation"
              tabs={EventTypeTabs}
              sticky
              linkProps={{ shallow: true }}
              itemClassname="items-start"
              iconClassName="md:mt-px"
            />
          </div>
          <div className="p-2 md:mx-0 md:p-0 xl:hidden">
            <HorizontalTabs tabs={EventTypeTabs} linkProps={{ shallow: true }} />
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
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <ConfirmationDialogContent
          isLoading={deleteMutation.isLoading}
          variety="danger"
          title={t(`delete${isManagedEvent}_event_type`)}
          confirmBtnText={t(`confirm_delete_event_type`)}
          loadingText={t(`confirm_delete_event_type`)}
          onConfirm={(e) => {
            e.preventDefault();
            deleteMutation.mutate({ id: eventType.id });
          }}>
          <p className="mt-5">
            <Trans
              i18nKey={`delete${isManagedEvent}_event_type_description`}
              components={{ li: <li />, ul: <ul className="ml-4 list-disc" /> }}>
              <ul>
                <li>Members assigned to this event type will also have their event types deleted.</li>
                <li>
                  Anyone who they&apos;ve shared their link with will no longer be able to book using it.
                </li>
              </ul>
            </Trans>
          </p>
        </ConfirmationDialogContent>
      </Dialog>
      <EmbedDialog />
    </Shell>
  );
}

export { EventTypeSingleLayout };
