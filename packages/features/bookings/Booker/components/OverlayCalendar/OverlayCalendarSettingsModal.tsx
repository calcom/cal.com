import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useState } from "react";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Alert,
  Dialog,
  DialogContent,
  EmptyScreen,
  ListItem,
  ListItemText,
  ListItemTitle,
  Switch,
  DialogClose,
  SkeletonContainer,
  SkeletonText,
} from "@calcom/ui";
import { Calendar } from "@calcom/ui/components/icon";

import { useLocalSet } from "../hooks/useLocalSet";
import { useOverlayCalendarStore } from "./store";

interface IOverlayCalendarContinueModalProps {
  open?: boolean;
  onClose?: (state: boolean) => void;
}

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="border-subtle mt-3 space-y-4 rounded-xl border px-4 py-4 ">
        <SkeletonText className="h-4 w-full" />
        <SkeletonText className="h-4 w-full" />
        <SkeletonText className="h-4 w-full" />
        <SkeletonText className="h-4 w-full" />
      </div>
    </SkeletonContainer>
  );
};

export function OverlayCalendarSettingsModal(props: IOverlayCalendarContinueModalProps) {
  const utils = trpc.useContext();
  const [initalised, setInitalised] = useState(false);
  const searchParams = useSearchParams();
  const setOverlayBusyDates = useOverlayCalendarStore((state) => state.setOverlayBusyDates);
  const { data, isLoading } = trpc.viewer.connectedCalendars.useQuery(undefined, {
    enabled: !!props.open || Boolean(searchParams?.get("overlayCalendar")),
  });
  const { toggleValue, hasItem, set } = useLocalSet<{
    credentialId: number;
    externalId: string;
  }>("toggledConnectedCalendars", []);

  const router = useRouter();
  const { t } = useLocale();

  useEffect(() => {
    if (data?.connectedCalendars && set.size === 0 && !initalised) {
      data?.connectedCalendars.forEach((item) => {
        item.calendars?.forEach((cal) => {
          const id = { credentialId: item.credentialId, externalId: cal.externalId };
          if (cal.primary) {
            toggleValue(id);
          }
        });
      });
      setInitalised(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, hasItem, set, initalised]);

  return (
    <>
      <Dialog open={props.open} onOpenChange={props.onClose}>
        <DialogContent
          enableOverflow
          type="creation"
          title="Calendar Settings"
          className="pb-4"
          description={t("view_overlay_calendar_events")}>
          <div className="no-scrollbar max-h-full overflow-y-scroll ">
            {isLoading ? (
              <SkeletonLoader />
            ) : (
              <>
                {data?.connectedCalendars.length === 0 ? (
                  <EmptyScreen
                    Icon={Calendar}
                    headline={t("no_calendar_installed")}
                    description={t("no_calendar_installed_description")}
                    buttonText={t("add_a_calendar")}
                    buttonOnClick={() => router.push("/apps/categories/calendar")}
                  />
                ) : (
                  <>
                    {data?.connectedCalendars.map((item) => (
                      <Fragment key={item.credentialId}>
                        {item.error && !item.calendars && (
                          <Alert severity="error" title={item.error.message} />
                        )}
                        {item?.error === undefined && item.calendars && (
                          <ListItem className="flex-col rounded-md">
                            <div className="flex w-full flex-1 items-center space-x-3 pb-4 rtl:space-x-reverse">
                              {
                                // eslint-disable-next-line @next/next/no-img-element
                                item.integration.logo && (
                                  <img
                                    className={classNames(
                                      "h-10 w-10",
                                      item.integration.logo.includes("-dark") && "dark:invert"
                                    )}
                                    src={item.integration.logo}
                                    alt={item.integration.title}
                                  />
                                )
                              }
                              <div className="flex-grow truncate pl-2">
                                <ListItemTitle component="h3" className="space-x-2 rtl:space-x-reverse">
                                  <Link href={`/apps/${item.integration.slug}`}>
                                    {item.integration.name || item.integration.title}
                                  </Link>
                                </ListItemTitle>
                                <ListItemText component="p">{item.primary.email}</ListItemText>
                              </div>
                            </div>
                            <div className="border-subtle w-full border-t pt-4">
                              <ul className="space-y-4">
                                {item.calendars.map((cal, index) => {
                                  const id = cal.integrationTitle ?? `calendar-switch-${index}`;
                                  return (
                                    <li className="flex gap-3" key={id}>
                                      <Switch
                                        id={id}
                                        checked={hasItem({
                                          credentialId: item.credentialId,
                                          externalId: cal.externalId,
                                        })}
                                        onCheckedChange={() => {
                                          toggleValue({
                                            credentialId: item.credentialId,
                                            externalId: cal.externalId,
                                          });
                                          setOverlayBusyDates([]);
                                          utils.viewer.availability.calendarOverlay.reset();
                                        }}
                                      />
                                      <label htmlFor={id}>{cal.name}</label>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          </ListItem>
                        )}
                      </Fragment>
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          <div className="mt-4 flex gap-2 self-end">
            <DialogClose>{t("done")}</DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
