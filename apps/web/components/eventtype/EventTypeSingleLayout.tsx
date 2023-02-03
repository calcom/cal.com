import { TFunction } from "next-i18next";
import { useRouter } from "next/router";
import { EventTypeSetupProps, FormValues } from "pages/event-types/[type]";
import { useMemo, useState, Suspense } from "react";
import { UseFormReturn } from "react-hook-form";
import { TbWebhook } from "react-icons/tb";

import Shell from "@calcom/features/shell/Shell";
import { classNames } from "@calcom/lib";
import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
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
  FiLink,
  FiCalendar,
  FiClock,
  FiSliders,
  FiRepeat,
  FiGrid,
  FiZap,
  FiUsers,
  FiExternalLink,
  FiCode,
  FiTrash,
  FiMoreHorizontal,
  FiLoader,
} from "@calcom/ui/components/icon";

import { EmbedButton, EmbedDialog } from "@components/Embed";

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
};

function getNavigation(props: {
  t: TFunction;
  eventType: Props["eventType"];
  enabledAppsNumber: number;
  enabledWorkflowsNumber: number;
  installedAppsNumber: number;
}) {
  const { eventType, t, enabledAppsNumber, installedAppsNumber, enabledWorkflowsNumber } = props;
  const duration =
    eventType.metadata?.multipleDuration?.map((duration) => ` ${duration}`) || eventType.length;

  return [
    {
      name: "event_setup_tab_title",
      href: `/event-types/${eventType.id}?tabName=setup`,
      icon: FiLink,
      info: `${duration} ${t("minute_timeUnit")}`, // TODO: Get this from props
    },
    {
      name: "availability",
      href: `/event-types/${eventType.id}?tabName=availability`,
      icon: FiCalendar,
      info: `default_schedule_name`, // TODO: Get this from props
    },
    {
      name: "event_limit_tab_title",
      href: `/event-types/${eventType.id}?tabName=limits`,
      icon: FiClock,
      info: `event_limit_tab_description`,
    },
    {
      name: "event_advanced_tab_title",
      href: `/event-types/${eventType.id}?tabName=advanced`,
      icon: FiSliders,
      info: `event_advanced_tab_description`,
    },
    {
      name: "recurring",
      href: `/event-types/${eventType.id}?tabName=recurring`,
      icon: FiRepeat,
      info: `recurring_event_tab_description`,
    },
    {
      name: "apps",
      href: `/event-types/${eventType.id}?tabName=apps`,
      icon: FiGrid,
      //TODO: Handle proper translation with count handling
      info: `${installedAppsNumber} apps, ${enabledAppsNumber} ${t("active")}`,
    },
    {
      name: "workflows",
      href: `/event-types/${eventType.id}?tabName=workflows`,
      icon: FiZap,
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
}: Props) {
  const utils = trpc.useContext();
  const { t } = useLocale();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const hasPermsToDelete = currentUserMembership?.role !== "MEMBER" || !currentUserMembership;

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

  // Define tab navigation here
  const EventTypeTabs = useMemo(() => {
    const navigation = getNavigation({
      t,
      eventType,
      enabledAppsNumber,
      installedAppsNumber,
      enabledWorkflowsNumber,
    });
    // If there is a team put this navigation item within the tabs
    if (team) {
      navigation.splice(2, 0, {
        name: "assignment",
        href: `/event-types/${eventType.id}?tabName=team`,
        icon: FiUsers,
        info: eventType.schedulingType === "COLLECTIVE" ? "collective" : "round_robin",
      });
      navigation.push({
        name: "webhooks",
        href: `/event-types/${eventType.id}?tabName=webhooks`,
        icon: TbWebhook,
        info: `${eventType.webhooks.filter((webhook) => webhook.active).length} ${t("active")}`,
      });
    }
    return navigation;
  }, [t, eventType, installedAppsNumber, enabledAppsNumber, enabledWorkflowsNumber, team]);

  const permalink = `${CAL_URL}/${team ? `team/${team.slug}` : eventType.users[0].username}/${
    eventType.slug
  }`;

  const embedLink = `${team ? `team/${team.slug}` : eventType.users[0].username}/${eventType.slug}`;

  return (
    <Shell
      backPath="/event-types"
      title={eventType.title + " | " + t("event_type")}
      heading={eventType.title}
      CTA={
        <div className="flex items-center justify-end">
          <div className="hidden items-center rounded-md px-2 sm:flex sm:hover:bg-gray-100">
            <Skeleton
              as={Label}
              htmlFor="hiddenSwitch"
              className="mt-2 hidden cursor-pointer self-center whitespace-nowrap pr-2 sm:inline">
              {t("hide_from_profile")}
            </Skeleton>
            <Switch
              id="hiddenSwitch"
              defaultChecked={formMethods.getValues("hidden")}
              onCheckedChange={(e) => {
                formMethods.setValue("hidden", e);
              }}
            />
          </div>
          <VerticalDivider className="hidden lg:block" />

          {/* TODO: Figure out why combined isnt working - works in storybook */}
          <ButtonGroup combined containerProps={{ className: "border-gray-300 hidden lg:flex" }}>
            {/* We have to warp this in tooltip as it has a href which disabels the tooltip on buttons */}
            <Tooltip content={t("preview")}>
              <Button
                color="secondary"
                target="_blank"
                variant="icon"
                href={permalink}
                rel="noreferrer"
                StartIcon={FiExternalLink}
              />
            </Tooltip>

            <Button
              color="secondary"
              variant="icon"
              StartIcon={FiLink}
              tooltip={t("copy_link")}
              onClick={() => {
                navigator.clipboard.writeText(permalink);
                showToast("Link copied!", "success");
              }}
            />
            <EmbedButton
              embedUrl={encodeURIComponent(embedLink)}
              StartIcon={FiCode}
              color="secondary"
              variant="icon"
              tooltip={t("embed")}
            />
            <Button
              color="secondary"
              variant="icon"
              StartIcon={FiTrash}
              tooltip={t("delete")}
              disabled={!hasPermsToDelete}
              onClick={() => setDeleteDialogOpen(true)}
            />
          </ButtonGroup>

          <VerticalDivider className="hidden lg:block" />

          <Dropdown>
            <DropdownMenuTrigger asChild>
              <Button className="lg:hidden" StartIcon={FiMoreHorizontal} variant="icon" color="secondary" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem className="focus:ring-gray-100">
                <DropdownItem
                  target="_blank"
                  type="button"
                  StartIcon={FiExternalLink}
                  href={permalink}
                  rel="noreferrer">
                  {t("preview")}
                </DropdownItem>
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:ring-gray-100">
                <DropdownItem
                  type="button"
                  StartIcon={FiLink}
                  onClick={() => {
                    navigator.clipboard.writeText(permalink);
                    showToast("Link copied!", "success");
                  }}>
                  {t("copy_link")}
                </DropdownItem>
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:ring-gray-100">
                <DropdownItem
                  type="button"
                  StartIcon={FiTrash}
                  disabled={!hasPermsToDelete}
                  onClick={() => setDeleteDialogOpen(true)}>
                  {t("delete")}
                </DropdownItem>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="block sm:hidden" />
              <div className="flex items-center rounded-md py-1.5 px-4 sm:hidden sm:hover:bg-gray-100">
                <Skeleton
                  as={Label}
                  htmlFor="hiddenSwitch"
                  className="mt-2 inline cursor-pointer self-center pr-2 sm:hidden">
                  {t("hide_from_profile")}
                </Skeleton>
                <Switch
                  id="hiddenSwitch"
                  defaultChecked={formMethods.getValues("hidden")}
                  onCheckedChange={(e) => {
                    formMethods.setValue("hidden", e);
                  }}
                />
              </div>
            </DropdownMenuContent>
          </Dropdown>
          <div className="border-l-2 border-gray-300" />
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
      <Suspense fallback={<FiLoader />}>
        <div className="flex flex-col xl:flex-row xl:space-x-6">
          <div className="hidden xl:block">
            <VerticalTabs
              className="primary-navigation"
              tabs={EventTypeTabs}
              sticky
              linkProps={{ shallow: true }}
            />
          </div>
          <div className="p-2 md:mx-0 md:p-0 xl:hidden">
            <HorizontalTabs tabs={EventTypeTabs} linkProps={{ shallow: true }} />
          </div>
          <div className="w-full ltr:mr-2 rtl:ml-2">
            <div
              className={classNames(
                "mt-4 rounded-md  border-gray-200 bg-white sm:mx-0 xl:mt-0",
                disableBorder ? "border-0 xl:-mt-4 " : "p-2 md:border md:p-6"
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
          title={t("delete_event_type")}
          confirmBtnText={t("confirm_delete_event_type")}
          loadingText={t("confirm_delete_event_type")}
          onConfirm={(e) => {
            e.preventDefault();
            deleteMutation.mutate({ id: eventType.id });
          }}>
          {t("delete_event_type_description")}
        </ConfirmationDialogContent>
      </Dialog>
      <EmbedDialog />
    </Shell>
  );
}

export { EventTypeSingleLayout };
