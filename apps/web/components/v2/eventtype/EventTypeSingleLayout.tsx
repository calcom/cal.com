import { useRouter } from "next/router";
import { EventTypeSetupInfered, FormValues } from "pages/v2/event-types/[type]";
import { useEffect, useMemo, useState } from "react";
import { Loader } from "react-feather";

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
} from "@calcom/ui/v2";
import { Dialog } from "@calcom/ui/v2/core/Dialog";
import Shell from "@calcom/ui/v2/core/Shell";

import { ClientSuspense } from "@components/ClientSuspense";

type Props = {
  children: React.ReactNode;
  eventType: EventTypeSetupInfered["eventType"];
  currentUserMembership: EventTypeSetupInfered["currentUserMembership"];
  team: EventTypeSetupInfered["team"];
};

function EventTypeSingleLayout({ children, eventType, currentUserMembership, team }: Props) {
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
        info: `X Active`,
      },
      {
        name: "workflows",
        tabName: "workflows",
        icon: Icon.FiCloudLightning,
        info: `X Active`,
      },
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
        <div className="flex">
          <div className="flex items-center space-x-2 border-r-2 border-gray-300 pr-5">
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
          <ButtonGroup combined containerProps={{ className: "px-4 border-gray-300" }}>
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
            />
          </ButtonGroup>
          {/* TODO: we'd have to move all of the form logic up to this layout to  make use of this save button here - then use formcontext to do all the magic */}
          {/* <Button className="ml-4">{t("save")}</Button> */}
        </div>
      }>
      <ClientSuspense fallback={<Loader />}>
        <div className="flex flex-col space-x-8 xl:flex-row">
          <div className="hidden xl:block">
            <VerticalTabs tabs={EventTypeTabs} />
          </div>
          <div className="block xl:hidden">
            <HorizontalTabs tabs={EventTypeTabs} />
          </div>
          <div className="w-full  ltr:mr-2 rtl:ml-2 lg:w-9/12">
            <div className="-mx-4 rounded-md border border-neutral-200 bg-white p-6 sm:mx-0 sm:p-10">
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
