import { useMemo, useState } from "react";

import { CalendarSwitch } from "@calcom/features/calendars/CalendarSwitch";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, showToast } from "@calcom/ui";

import { CheckCircleIcon } from "@components/ui/CheckCircleIcon";

interface ZohoConnectionSetupPageProps {
  completeSetupToken: string;
  zohoCalendar: Record<string, string>;
}

export const ZohoConnectionSetupPage = ({
  completeSetupToken,
  zohoCalendar,
}: ZohoConnectionSetupPageProps) => {
  const [success, setSuccess] = useState(false);
  const { t } = useLocale();
  const query = trpc.viewer.public.zohoConnection.useQuery({ token: completeSetupToken });
  const mutation = trpc.viewer.public.completeZohoCalendarSetup.useMutation({
    onSettled: (data?: { status: string }) => {
      if (data?.status === "success") {
        setSuccess(true);
      } else {
        showToast(`Something went wrong when completing your setup.`, "error");
      }
    },
  });

  const calendars = useMemo(() => {
    if (query.isPending || query.error) {
      return [];
    }
    const connectedZohoCalendars = query.data.connectedCalendars?.find(
      (c) => c.integration.slug === zohoCalendar.slug
    );

    if (!connectedZohoCalendars) {
      return [];
    }

    return connectedZohoCalendars.calendars;
  }, [query.data?.connectedCalendars, query.isPending, query.error, zohoCalendar.slug]);

  const destinationCalendar = useMemo(() => {
    if (query.isPending || query.error) {
      return null;
    }

    return query.data?.destinationCalendar;
  }, [query.data?.destinationCalendar, query.isPending, query.error]);

  if (success) {
    return (
      <div className="mx-auto py-6 sm:px-4 md:py-24">
        <div className="relative">
          <div className="sm:mx-auto sm:w-full sm:max-w-[600px]">
            <div className="mb-auto mt-8 w-full sm:mx-auto">
              <div className="bg-default dark:bg-muted border-subtle mx-2 w-full rounded-md border px-4 py-10 sm:px-10">
                <div className="center mb-3 w-full">
                  <CheckCircleIcon className="mx-auto w-16" />
                </div>
                <p className="font-cal mb-3 w-full text-center text-[28px] font-medium leading-7">
                  {t("scheduling_setup_success")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto py-6 sm:px-4 md:py-24">
      <div className="relative">
        <div className="sm:mx-auto sm:w-full sm:max-w-[600px]">
          <div className="mx-auto px-4 sm:max-w-[520px]">
            <header>
              <p className="font-cal mb-3 text-center text-[28px] font-medium leading-7">
                {t("zoho_calendar_scheduling_setup")}
              </p>
            </header>
          </div>
          <div className="my-16">
            <div className="border-subtle relative flex flex-col rounded-md border p-5">
              <div className="flex">
                <div className="mr-4 flex items-start">
                  <img
                    src={zohoCalendar.logo}
                    alt={`${zohoCalendar.name} Logo`}
                    className={classNames(
                      zohoCalendar.logo.includes("-dark") && "dark:invert",
                      "mb-4 h-12 w-12 rounded-sm"
                    )}
                  />
                </div>
                <div className="flex">
                  <h3 className="text-emphasis font-medium">{zohoCalendar.name}</h3>
                </div>
              </div>
              <hr className="border-subtle my-8 border" />
              <p className="text-subtle  text-sm">{t("toggle_calendars_conflict")}</p>

              <ul className="space-y-4 px-5 py-4">
                {calendars.map((cal) => (
                  <CalendarSwitch
                    key={cal.externalId}
                    externalId={cal.externalId}
                    title={cal.name || "Nameless calendar"}
                    name={cal.name || "Nameless calendar"}
                    type={zohoCalendar.type}
                    isChecked={cal.isSelected}
                    destination={cal.externalId === destinationCalendar?.externalId}
                    credentialId={cal.credentialId}
                    useEsaEndpoint
                    esaToken={completeSetupToken}
                  />
                ))}
              </ul>
            </div>
            {query.isPending ? null : (
              <div className="mt-8 flex w-full justify-end">
                <Button
                  onClick={() => {
                    mutation.mutate({ token: completeSetupToken });
                  }}
                  loading={mutation.isPending}>
                  {t("done")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
