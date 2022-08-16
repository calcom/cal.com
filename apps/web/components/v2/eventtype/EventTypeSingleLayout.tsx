import { DropdownMenuItemIndicator } from "@radix-ui/react-dropdown-menu";
import { useRouter } from "next/router";
import { EventTypeSetupInfered, FormValues } from "pages/v2/event-types/[type]";
import { useEffect, useMemo, useState } from "react";
import { Loader } from "react-feather";

import { classNames } from "@calcom/lib";
import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc, TRPCClientError } from "@calcom/trpc/react";
import ConfirmationDialogContent from "@calcom/ui/ConfirmationDialogContent";
import { Icon } from "@calcom/ui/Icon";
import {
  Button,
  ButtonGroup,
  Switch,
  Tooltip,
  showToast,
  VerticalTabItemProps,
  VerticalTabs,
  HorizontalTabs,
  Badge,
} from "@calcom/ui/v2";
import { Dialog } from "@calcom/ui/v2/core/Dialog";
import Dropdown, {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@calcom/ui/v2/core/Dropdown";
import Shell from "@calcom/ui/v2/core/Shell";

import { ClientSuspense } from "@components/ClientSuspense";

type Props = {
  children: React.ReactNode;
  eventType: EventTypeSetupInfered["eventType"];
  currentUserMembership: EventTypeSetupInfered["currentUserMembership"];
  team: EventTypeSetupInfered["team"];
  disableBorder?: boolean;
  enabledAppsNumber: number;
};

function EventTypeSingleLayout({
  children,
  eventType,
  currentUserMembership,
  team,
  disableBorder,
  enabledAppsNumber,
}: Props) {
  const utils = trpc.useContext();
  const router = useRouter();
  const { t } = useLocale();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const setHiddenMutation = trpc.useMutation("viewer.eventTypes.update", {
    onError: async (err) => {
      console.error(err.message);
      await utils.cancelQuery(["viewer.eventTypes"]);
      await utils.invalidateQueries(["viewer.eventTypes"]);
    },
    onSettled: async () => {
      await utils.invalidateQueries(["viewer.eventTypes"]);
    },
  });

  const hasPermsToDelete = currentUserMembership?.role !== "MEMBER" || !currentUserMembership;

  const deleteMutation = trpc.useMutation("viewer.eventTypes.delete", {
    onSuccess: async () => {
      await utils.invalidateQueries(["viewer.eventTypes"]);
      showToast(t("event_type_deleted_successfully"), "success");
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
    return [
      {
        name: "event_setup_tab_title",
        tabName: "setup",
        icon: Icon.FiLink,
        info: `${eventType.length} Mins`, // TODO: Get this from props
      },
      {
        name: "availability",
        tabName: "availability",
        icon: Icon.FiCalendar,
        info: `Working Hours`, // TODO: Get this from props
      },
      {
        name: "event_limit_tab_title",
        tabName: "limits",
        icon: Icon.FiClock,
        info: `event_limit_tab_description`,
      },
      {
        name: "event_advanced_tab_title",
        tabName: "advanced",
        icon: Icon.FiSliders,
        info: `event_advanced_tab_description`,
      },
      {
        name: "recurring",
        tabName: "recurring",
        icon: Icon.FiRotateCcw,
        info: `recurring_event_description`,
      },
      {
        name: "apps",
        tabName: "apps",
        icon: Icon.FiGrid,
        info: `${enabledAppsNumber} Active`,
      },
      // TODO: After V2 workflow page has been completed
      // {
      //   name: "workflows",
      //   tabName: "workflows",
      //   icon: Icon.FiCloudLightning,
      //   info: `X Active`,
      // },
    ] as VerticalTabItemProps[];
  }, [eventType]);

  useEffect(() => {
    // Default to the first in the list
    if (!router.query.tabName) {
      router.push({
        query: {
          ...router.query,
          tabName: EventTypeTabs[0].tabName,
        },
      });
    }
  }, [EventTypeTabs, router]);

  const permalink = `${CAL_URL}/${team ? `team/${team.slug}` : eventType.users[0].username}/${
    eventType.slug
  }`;

  return (
    <Shell
      title={t("event_type_title", { eventTypeTitle: eventType.title })}
      heading={eventType.title}
      subtitle={eventType.description || ""}
      CTA={
        <div className="flex items-center justify-end">
          <div className="hidden items-center space-x-2 border-r-2 border-gray-300 pr-5 xl:flex">
            <label htmlFor="Hidden" className="text-gray-900">
              {t("hide_from_profile")}
            </label>
            <Switch
              name="Hidden"
              checked={eventType.hidden}
              onCheckedChange={() => {
                setHiddenMutation.mutate({ id: eventType.id, hidden: eventType.hidden });
              }}
            />
          </div>
          {/* TODO: Figure out why combined isnt working - works in storybook */}
          <ButtonGroup combined containerProps={{ className: "px-4 border-gray-300 hidden xl:block" }}>
            {/* We have to warp this in tooltip as it has a href which disabels the tooltip on buttons */}
            <Tooltip content={t("preview")}>
              <Button
                color="secondary"
                target="_blank"
                size="icon"
                href={permalink}
                rel="noreferrer"
                StartIcon={Icon.FiExternalLink}
                combined
              />
            </Tooltip>

            <Button
              color="secondary"
              size="icon"
              StartIcon={Icon.FiLink}
              combined
              tooltip={t("copy_link")}
              onClick={() => {
                navigator.clipboard.writeText(permalink);
                showToast("Link copied!", "success");
              }}
            />
            <Button color="secondary" size="icon" StartIcon={Icon.FiCode} combined />
            <Button
              color="secondary"
              size="icon"
              StartIcon={Icon.FiTrash}
              combined
              disabled={!hasPermsToDelete}
              onClick={() => setDeleteDialogOpen(true)}
            />
          </ButtonGroup>
          <Dropdown>
            <DropdownMenuTrigger className="focus:ring-brand-900 flex h-[36px] w-auto justify-center rounded-md border border-gray-200 bg-transparent text-gray-700 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1">
              <Icon.FiMoreHorizontal className="group-hover:text-gray-800" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <Button
                  color="minimal"
                  StartIcon={Icon.FiExternalLink}
                  target="_blank"
                  href={permalink}
                  rel="noreferrer">
                  {t("preview")}
                </Button>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Button color="minimal" StartIcon={Icon.FiLink}>
                  {t("copy_link")}
                </Button>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Button
                  color="minimal"
                  StartIcon={Icon.FiTrash}
                  disabled={!hasPermsToDelete}
                  onClick={() => setDeleteDialogOpen(true)}>
                  {t("delete")}
                </Button>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem tabIndex={-2}>
                <button
                  className="flex items-center justify-center p-2 text-sm font-medium"
                  onClick={() => {
                    setHiddenMutation.mutate({ id: eventType.id, hidden: eventType.hidden });
                  }}>
                  <label htmlFor="mobileHiddenSwitch" className=" pr-2 text-gray-700 hover:bg-gray-100">
                    {t("hide_from_profile")}
                  </label>
                  <Badge variant="gray">{eventType.hidden ? t("hidden") : t("visible")}</Badge>
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </Dropdown>
          <div className="border-l-2 border-gray-300" />
          <Button className="ml-4" type="submit">
            {t("save")}
          </Button>
        </div>
      }>
      <ClientSuspense fallback={<Loader />}>
        <div className="flex flex-col xl:flex-row xl:space-x-8">
          <div className="hidden xl:block">
            <VerticalTabs tabs={EventTypeTabs} />
          </div>
          <div className="xl:hidden">
            <HorizontalTabs tabs={EventTypeTabs} />
          </div>
          <div className="w-full ltr:mr-2 rtl:ml-2">
            <div
              className={classNames(
                "mt-4 rounded-md  border-neutral-200 bg-white  sm:mx-0 xl:mt-0",
                disableBorder ? "border-0 xl:-mt-4 " : "border p-6 sm:p-10"
              )}>
              {children}
            </div>
          </div>
        </div>
      </ClientSuspense>
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
          {t("delete_event_type_description") as string}
        </ConfirmationDialogContent>
      </Dialog>
    </Shell>
  );
}

export { EventTypeSingleLayout };
