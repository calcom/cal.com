import { DialogTitle } from "@radix-ui/react-dialog";
import { Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from "@tremor/react";
import { Plus } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

import { getLayout } from "@calcom/features/MainLayout";
import { ShellMain } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button, Dialog, DialogClose, DialogContent, DialogFooter, Select, showToast } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const CTA = ({ data, openDialog }: { data: any; openDialog: Dispatch<SetStateAction<boolean>> }) => {
  const { t } = useLocale();

  if (!data) return null;

  return (
    <Button
      color="primary"
      StartIcon={Plus}
      title="New Sync"
      onClick={() => {
        console.log("clicked");
        openDialog(true);
      }}>
      New Sync
    </Button>
  );
};

export default function CalendarSyncPage() {
  const { t } = useLocale();

  const { data, isLoading } = trpc.viewer.connectedCalendars.useQuery(
    { type: "google_calendar" },
    {
      suspense: true,
      refetchOnWindowFocus: false,
    }
  );

  const { data: syncTasks, isLoading: syncTasksLoading } = trpc.viewer.calendarSync.list.useQuery();

  const createSyncTaskMutation = trpc.viewer.calendarSync.create.useMutation({
    onSuccess: () => {
      showToast("Success", "success");
    },
    onError: (error) => {
      showToast(t(error.message), "error");
    },
  });

  const [createNewSyncDialogOpen, setCreateNewSyncDialogOpen] = useState(false);

  const [selectedCalendar, setSelectedCalendar] = useState(null);
  console.log({ data });

  const syncCalendarOptions = data?.connectedCalendars.map((calendar) => ({
    label: calendar?.primary?.externalId,
    value: calendar?.primary?.externalId,
  }));

  const syncCalendarsMerged = data?.connectedCalendars.reduce((merged, option) => {
    return merged.concat(option?.calendars);
  }, []);

  const syncSubCalendarsOptions = syncCalendarsMerged?.map((calendar) => ({
    label: calendar?.name,
    value: calendar?.externalId,
  }));

  return (
    <ShellMain
      heading="Calendar Syncing"
      subtitle="Sync events between your calendars"
      CTA={<CTA data={data} openDialog={setCreateNewSyncDialogOpen} />}>
      <div className="py-4">
        <Table className="mt-5">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Syncing From</TableHeaderCell>
              <TableHeaderCell>Syncing to</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Privacy</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow />
            {syncTasks?.map((calendar) => (
              <TableRow key={calendar.sourceExternalId}>
                <TableCell>{calendar?.sourceExternalId}</TableCell>
                <TableCell>{calendar.sourceCredentialId}</TableCell>
                <TableCell>{calendar.toExternalId}</TableCell>
                <TableCell>{calendar.toCredentialId}</TableCell>
              </TableRow>
            ))}
            {/* {data === undefined ||
              (data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    <p className="text-subtle text-sm">{t("no_forwardings_found")}</p>
                  </TableCell>
                </TableRow>
              ))} */}
          </TableBody>
        </Table>
      </div>
      <Dialog open={createNewSyncDialogOpen} onOpenChange={setCreateNewSyncDialogOpen}>
        <DialogContent type="creation">
          <DialogTitle>
            <h3 className="text-2xl font-semibold">Create New Sync</h3>
          </DialogTitle>
          <p className="mt-4">Sync From:</p>
          <Select options={syncCalendarOptions} className="mt-1" />
          <Select options={syncSubCalendarsOptions} className="mt-1" />

          <p className="mt-8">Sync To:</p>
          <Select options={syncCalendarOptions} className="mt-1" />
          <Select options={syncSubCalendarsOptions} className="mt-1" />

          <div className="my-5 flex flex-row-reverse gap-x-2 sm:my-8">
            <DialogFooter>
              <DialogClose disabled={isLoading}>Cancel</DialogClose>
              <Button
                color="primary"
                className=""
                onClick={() => {
                  console.log("clicked");
                  createSyncTaskMutation.mutate({
                    sourceCredentialId: 1,
                    sourceExternalId: "demo",
                    toCredentialId: 1,
                    toExternalId: "demo",
                    allDayEventConfig: "NoAllDay",
                    color: "#000000",
                    privacy: "Personal",
                  });
                }}>
                Create Sync
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </ShellMain>
  );
}

CalendarSyncPage.PageWrapper = PageWrapper;
CalendarSyncPage.getLayout = getLayout;
