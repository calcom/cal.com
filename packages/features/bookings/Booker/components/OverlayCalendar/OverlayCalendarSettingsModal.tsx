import Link from "next/link";
import { Fragment } from "react";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  Alert,
  Dialog,
  DialogClose,
  DialogContent,
  EmptyScreen,
  ListItem,
  ListItemText,
  ListItemTitle,
  SkeletonContainer,
  SkeletonText,
  Switch,
} from "@calcom/ui";

import type { UseCalendarsReturnType } from "../hooks/useCalendars";

interface IOverlayCalendarSettingsModalProps {
  open?: boolean;
  onClose?: (state: boolean) => void;
  onClickNoCalendar?: () => void;
  isLoading: boolean;
  connectedCalendars: UseCalendarsReturnType["connectedCalendars"];
  onToggleConnectedCalendar: (externalCalendarId: string, credentialId: number) => void;
  checkIsCalendarToggled: (externalCalendarId: string, credentialId: number) => boolean;
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

export function OverlayCalendarSettingsModal({
  connectedCalendars,
  isLoading,
  open,
  onClose,
  onClickNoCalendar,
  onToggleConnectedCalendar,
  checkIsCalendarToggled,
}: IOverlayCalendarSettingsModalProps) {
  const { t } = useLocale();

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
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
                {connectedCalendars.length === 0 ? (
                  <EmptyScreen
                    Icon="calendar"
                    headline={t("no_calendar_installed")}
                    description={t("no_calendar_installed_description")}
                    buttonText={t("add_a_calendar")}
                    buttonOnClick={onClickNoCalendar}
                  />
                ) : (
                  <>
                    {connectedCalendars.map((item) => (
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
                                        checked={checkIsCalendarToggled(cal.externalId, item.credentialId)}
                                        onCheckedChange={() => {
                                          onToggleConnectedCalendar(cal.externalId, item.credentialId);
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
