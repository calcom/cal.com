import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Alert } from "@calcom/ui/components/alert";
import { DialogClose, DialogContent } from "@calcom/ui/components/dialog";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Switch } from "@calcom/ui/components/form";
import { ListItem, ListItemText, ListItemTitle } from "@calcom/ui/components/list";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";

type IOverlayCalendarSettingsModalProps = {
  open?: boolean;
  onClose?: (state: boolean) => void;
  onClickNoCalendar?: () => void;
  onToggleConnectedCalendar: (externalCalendarId: string, credentialId: number) => void;
  checkIsCalendarToggled: (externalCalendarId: string, credentialId: number) => boolean;
};

const SkeletonLoader = (): JSX.Element => {
  return (
    <SkeletonContainer>
      <div className="stack-y-4 mt-3 rounded-xl border border-subtle px-4 py-4">
        <SkeletonText className="h-4 w-full" />
        <SkeletonText className="h-4 w-full" />
        <SkeletonText className="h-4 w-full" />
        <SkeletonText className="h-4 w-full" />
      </div>
    </SkeletonContainer>
  );
};

export function OverlayCalendarSettingsModal({
  open,
  onClose,
  onClickNoCalendar,
  onToggleConnectedCalendar,
  checkIsCalendarToggled,
}: IOverlayCalendarSettingsModalProps): JSX.Element {
  const { t } = useLocale();
  const isPlatform = useIsPlatform();
  const { data, isPending: isLoading } = trpc.viewer.calendars.connectedCalendars.useQuery(undefined, {
    enabled: !!open,
  });

  let content: React.ReactNode;
  if (isLoading) {
    content = <SkeletonLoader />;
  } else if (data?.connectedCalendars.length === 0) {
    content = (
      <EmptyScreen
        Icon="calendar"
        headline={t("no_calendar_installed")}
        description={t("no_calendar_installed_description")}
        buttonText={t("add_a_calendar")}
        buttonOnClick={onClickNoCalendar}
      />
    );
  } else {
    content = data?.connectedCalendars.map((item) => (
      <Fragment key={item.credentialId}>
        {item.error && !item.calendars && <Alert severity="error" title={item.error.message} />}
        {item?.error === undefined && item.calendars && (
          <ListItem className="flex-col rounded-md">
            <div className="flex w-full flex-1 items-center space-x-3 pb-4 rtl:space-x-reverse">
              {item.integration.logo && (
                <Image
                  className={classNames(
                    "h-10 w-10",
                    item.integration.logo.includes("-dark") && "dark:invert"
                  )}
                  width={40}
                  height={40}
                  src={isPlatform ? `https://app.cal.com${item.integration.logo}` : item.integration.logo}
                  alt={`${item.integration.title} logo`}
                />
              )}
              <div className="grow truncate pl-2">
                <ListItemTitle component="h3" className="space-x-2 rtl:space-x-reverse">
                  <Link href={`/apps/${item.integration.slug}`}>
                    {item.integration.name || item.integration.title}
                  </Link>
                </ListItemTitle>
                <ListItemText component="p">{item.primary?.email}</ListItemText>
              </div>
            </div>
            <div className="border-subtle w-full border-t pt-4">
              <ul className="stack-y-4">
                {item.calendars.map((cal, index) => {
                  const id = cal.integrationTitle ?? `calendar-switch-${index}`;
                  return (
                    <li className="flex gap-3" key={id}>
                      <Switch
                        id={id}
                        label={cal.name}
                        checked={checkIsCalendarToggled(cal.externalId, item.credentialId)}
                        onCheckedChange={() => {
                          onToggleConnectedCalendar(cal.externalId, item.credentialId);
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          </ListItem>
        )}
      </Fragment>
    ));
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        enableOverflow
        type="creation"
        title={t("calendar_settings")}
        className="pb-4"
        description={t("view_overlay_calendar_events")}>
        <div className="no-scrollbar max-h-full overflow-y-scroll">{content}</div>
        <div className="mt-4 flex gap-2 self-end">
          <DialogClose>{t("done")}</DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
