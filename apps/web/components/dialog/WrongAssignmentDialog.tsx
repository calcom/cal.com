import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import AddMembersWithSwitch, {
  mapUserToValue,
} from "@calcom/features/eventtypes/components/AddMembersWithSwitch";
import type { FormValues as EventTypeFormValues, Host, TeamMember } from "@calcom/features/eventtypes/lib/types";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Label } from "@calcom/ui/components/form";
import { TextArea } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

interface IWrongAssignmentDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  bookingUid: string;
  routingReason: string | null;
  guestEmail: string;
  hostEmail: string;
  hostName: string | null;
  teamId: number | null;
}

interface FormValues {
  correctAssignee: string;
  additionalNotes: string;
}

// Wrapper component that provides AddMembersWithSwitch with its own FormContext
const TeamMemberSelector = ({
  teamId,
  teamMembers,
  onMemberSelect,
}: {
  teamId: number;
  teamMembers: TeamMember[];
  onMemberSelect: (email: string) => void;
}) => {
  const { t } = useLocale();
  const [assignAllTeamMembers, setAssignAllTeamMembers] = useState(false);
  const [selectedHosts, setSelectedHosts] = useState<Host[]>([]);

  // Create a minimal form context for AddMembersWithSwitch
  const innerForm = useForm<EventTypeFormValues>({
    defaultValues: {
      assignRRMembersUsingSegment: false,
      rrSegmentQueryValue: null,
      hosts: [],
      assignAllTeamMembers: false,
    },
  });

  const handleHostsChange = (hosts: Host[]) => {
    setSelectedHosts(hosts);
    // When a host is selected, find their email and call onMemberSelect
    if (hosts.length > 0) {
      const lastHost = hosts[hosts.length - 1];
      const member = teamMembers.find((m) => m.value === String(lastHost.userId));
      if (member) {
        onMemberSelect(member.email);
      }
    } else {
      onMemberSelect("");
    }
  };

  return (
    <FormProvider {...innerForm}>
      <AddMembersWithSwitch
        teamId={teamId}
        groupId={null}
        teamMembers={teamMembers}
        value={selectedHosts}
        onChange={handleHostsChange}
        assignAllTeamMembers={assignAllTeamMembers}
        setAssignAllTeamMembers={setAssignAllTeamMembers}
        automaticAddAllEnabled={false}
        isFixed={false}
        isSegmentApplicable={false}
        placeholder={t("select_team_member")}
        onActive={() => {}}
      />
    </FormProvider>
  );
};

export const WrongAssignmentDialog = (props: IWrongAssignmentDialog) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const { copyToClipboard, isCopied } = useCopy();
  const {
    isOpenDialog,
    setIsOpenDialog,
    bookingUid,
    routingReason,
    guestEmail,
    hostEmail,
    hostName,
    teamId,
  } = props;

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      correctAssignee: "",
      additionalNotes: "",
    },
  });

  // Fetch team members when teamId is available
  const { data: teamMembersData } = trpc.viewer.teams.listMembers.useQuery(
    { teamId: teamId!, limit: 100 },
    { enabled: !!teamId && isOpenDialog }
  );

  // Transform team members to the format expected by AddMembersWithSwitch
  const teamMembers: TeamMember[] =
    teamMembersData?.members.map((member) =>
      mapUserToValue(
        {
          id: member.id,
          name: member.name,
          username: member.username,
          avatar: member.avatarUrl ?? "",
          email: member.email,
          defaultScheduleId: null,
        },
        t("pending")
      )
    ) ?? [];

  const { mutate: reportWrongAssignment, isPending } =
    trpc.viewer.bookings.reportWrongAssignment.useMutation({
      async onSuccess() {
        showToast(t("wrong_assignment_reported"), "success");
        setIsOpenDialog(false);
        await utils.viewer.bookings.invalidate();
      },
      onError(error) {
        showToast(error.message || t("unexpected_error_try_again"), "error");
      },
    });

  const onSubmit = (data: FormValues) => {
    reportWrongAssignment({
      bookingUid,
      correctAssignee: data.correctAssignee || undefined,
      additionalNotes: data.additionalNotes || undefined,
    });
  };

  const handleMemberSelect = (email: string) => {
    setValue("correctAssignee", email);
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent enableOverflow>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-row space-x-3">
            <div className="w-full">
              <DialogHeader title={t("wrong_assignment")} />

              <div className="mb-4 space-y-3">
                <div>
                  <Label className="text-emphasis mb-1 block text-sm font-medium">
                    {t("routing_reason")}
                  </Label>
                  <p className="text-default bg-muted rounded-md px-3 py-2 text-sm">
                    {routingReason || t("no_routing_reason")}
                  </p>
                </div>

                <div>
                  <Label className="text-emphasis mb-1 block text-sm font-medium">
                    {t("who_booked_it")}
                  </Label>
                  <div className="text-default bg-muted flex items-center justify-between rounded-md px-3 py-2 text-sm">
                    <span>{guestEmail}</span>
                    <button
                      type="button"
                      className="text-subtle hover:text-emphasis ml-2"
                      onClick={() => copyToClipboard(guestEmail)}>
                      <Icon name={isCopied ? "check" : "copy"} className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-emphasis mb-1 block text-sm font-medium">
                    {t("who_received_it")}
                  </Label>
                  <p className="text-default bg-muted rounded-md px-3 py-2 text-sm">
                    {hostName ? `${hostName} (${hostEmail})` : hostEmail}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <Label htmlFor="correctAssignee" className="text-emphasis mb-2 block text-sm font-medium">
                  {t("who_should_have_received_it")}{" "}
                  <span className="text-subtle font-normal">({t("optional")})</span>
                </Label>
                {teamId && teamMembers.length > 0 ? (
                  <TeamMemberSelector
                    teamId={teamId}
                    teamMembers={teamMembers}
                    onMemberSelect={handleMemberSelect}
                  />
                ) : (
                  <Controller
                    name="correctAssignee"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="email"
                        placeholder={t("enter_email")}
                        className="border-default bg-default text-emphasis placeholder:text-muted focus:border-emphasis focus:ring-emphasis block w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1"
                      />
                    )}
                  />
                )}
              </div>

              <div className="mb-4">
                <Label htmlFor="additionalNotes" className="text-emphasis mb-2 block text-sm font-medium">
                  {t("additional_notes")} <span className="text-error">*</span>
                </Label>
                <Controller
                  name="additionalNotes"
                  control={control}
                  rules={{ required: t("field_required") }}
                  render={({ field }) => (
                    <TextArea
                      {...field}
                      placeholder={t("wrong_assignment_notes_placeholder")}
                      rows={3}
                    />
                  )}
                />
                {errors.additionalNotes && (
                  <p className="text-error mt-1 text-sm">{errors.additionalNotes.message}</p>
                )}
              </div>

              <Alert
                severity="info"
                title={t("did_you_know")}
                message={t("wrong_assignment_crm_info")}
              />
            </div>
          </div>

          <DialogFooter showDivider className="mt-8">
            <Button
              type="button"
              color="secondary"
              onClick={() => setIsOpenDialog(false)}
              disabled={isPending}>
              {t("close")}
            </Button>
            <Button type="submit" color="primary" disabled={isPending} loading={isPending}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
