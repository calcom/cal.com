import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Label, Select, TextArea } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import type { Dispatch, SetStateAction } from "react";
import type { Control, ControllerRenderProps } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";

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

interface TeamMemberOption {
  label: string;
  value: string;
  email: string;
}

interface RoutingInfoSectionProps {
  routingReason: string | null;
  noRoutingReasonText: string;
  routingReasonLabel: string;
  guestEmail: string;
  whoBookedItLabel: string;
  hostEmail: string;
  hostName: string | null;
  whoReceivedItLabel: string;
  copyToClipboard: (text: string) => void;
  isCopied: boolean;
}

function RoutingInfoSection(props: RoutingInfoSectionProps): JSX.Element {
  const {
    routingReason,
    noRoutingReasonText,
    routingReasonLabel,
    guestEmail,
    whoBookedItLabel,
    hostEmail,
    hostName,
    whoReceivedItLabel,
    copyToClipboard,
    isCopied,
  } = props;

  let copyIconName: "check" | "copy" = "copy";
  if (isCopied) {
    copyIconName = "check";
  }

  let hostDisplay = hostEmail;
  if (hostName) {
    hostDisplay = `${hostName} (${hostEmail})`;
  }

  const handleCopyClick = (): void => {
    copyToClipboard(guestEmail);
  };

  return (
    <div className="-mt-2 mb-4 space-y-3">
      <div>
        <Label className="text-emphasis mb-1 block text-sm font-medium">{routingReasonLabel}</Label>
        <p className="text-default bg-muted rounded-md px-3 py-2 text-sm">
          {routingReason || noRoutingReasonText}
        </p>
      </div>

      <div>
        <Label className="text-emphasis mb-1 block text-sm font-medium">{whoBookedItLabel}</Label>
        <div className="text-default bg-muted flex items-center justify-between rounded-md px-3 py-2 text-sm">
          <span>{guestEmail}</span>
          <button type="button" className="text-subtle hover:text-emphasis ml-2" onClick={handleCopyClick}>
            <Icon name={copyIconName} className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div>
        <Label className="text-emphasis mb-1 block text-sm font-medium">{whoReceivedItLabel}</Label>
        <p className="text-default bg-muted rounded-md px-3 py-2 text-sm">{hostDisplay}</p>
      </div>
    </div>
  );
}

interface AssigneeSectionProps {
  teamId: number | null;
  teamMemberOptions: TeamMemberOption[];
  control: Control<FormValues>;
  whoShouldHaveReceivedItLabel: string;
  optionalLabel: string;
  selectTeamMemberPlaceholder: string;
  enterEmailPlaceholder: string;
}

interface AdditionalNotesSectionProps {
  control: Control<FormValues>;
  additionalNotesLabel: string;
  placeholder: string;
  fieldRequiredText: string;
  errorMessage: string | undefined;
}

function AdditionalNotesSection(props: AdditionalNotesSectionProps): JSX.Element {
  const { control, additionalNotesLabel, placeholder, fieldRequiredText, errorMessage } = props;

  const renderTextArea = ({
    field,
  }: {
    field: ControllerRenderProps<FormValues, "additionalNotes">;
  }): JSX.Element => <TextArea {...field} placeholder={placeholder} rows={3} />;

  return (
    <div className="mb-4">
      <Label htmlFor="additionalNotes" className="text-emphasis mb-2 block text-sm font-medium">
        {additionalNotesLabel} <span className="text-error">*</span>
      </Label>
      <Controller
        name="additionalNotes"
        control={control}
        rules={{ required: fieldRequiredText }}
        render={renderTextArea}
      />
      {errorMessage && <p className="text-error mt-1 text-sm">{errorMessage}</p>}
    </div>
  );
}

function AssigneeSection(props: AssigneeSectionProps): JSX.Element {
  const {
    teamId,
    teamMemberOptions,
    control,
    whoShouldHaveReceivedItLabel,
    optionalLabel,
    selectTeamMemberPlaceholder,
    enterEmailPlaceholder,
  } = props;

  const showTeamSelector = teamId && teamMemberOptions.length > 0;

  const renderTeamSelect = ({
    field,
  }: {
    field: ControllerRenderProps<FormValues, "correctAssignee">;
  }): JSX.Element => {
    const handleChange = (option: TeamMemberOption | null): void => {
      if (option) field.onChange(option.value);
    };
    return (
      <Select
        options={teamMemberOptions}
        placeholder={selectTeamMemberPlaceholder}
        onChange={handleChange}
        value={teamMemberOptions.find((opt) => opt.value === field.value) || null}
        isClearable
      />
    );
  };

  const renderEmailInput = ({
    field,
  }: {
    field: ControllerRenderProps<FormValues, "correctAssignee">;
  }): JSX.Element => (
    <input
      {...field}
      type="email"
      placeholder={enterEmailPlaceholder}
      className="border-default bg-default text-emphasis placeholder:text-muted focus:border-emphasis focus:ring-emphasis block w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1"
    />
  );

  let assigneeField: JSX.Element;
  if (showTeamSelector) {
    assigneeField = <Controller name="correctAssignee" control={control} render={renderTeamSelect} />;
  } else {
    assigneeField = <Controller name="correctAssignee" control={control} render={renderEmailInput} />;
  }

  return (
    <div className="mb-4">
      <Label htmlFor="correctAssignee" className="text-emphasis mb-2 block text-sm font-medium">
        {whoShouldHaveReceivedItLabel} <span className="text-subtle font-normal">({optionalLabel})</span>
      </Label>
      {assigneeField}
    </div>
  );
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: Dialog component with hooks and state management - already split into 3 sub-components
export function WrongAssignmentDialog(props: IWrongAssignmentDialog): JSX.Element {
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
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      correctAssignee: "",
      additionalNotes: "",
    },
  });

  const teamIdForQuery = teamId ?? 0;
  const { data: teamMembersData } = trpc.viewer.teams.listMembers.useQuery(
    { teamId: teamIdForQuery, limit: 100 },
    { enabled: !!teamId && isOpenDialog }
  );

  const teamMemberOptions: TeamMemberOption[] =
    teamMembersData?.members.map((member) => ({
      label: member.name || member.email,
      value: member.email,
      email: member.email,
    })) ?? [];

  const { mutate: reportWrongAssignment, isPending } = trpc.viewer.bookings.reportWrongAssignment.useMutation(
    {
      async onSuccess(): Promise<void> {
        showToast(t("wrong_assignment_reported"), "success");
        setIsOpenDialog(false);
        await utils.viewer.bookings.invalidate();
      },
      onError(error: { message?: string }): void {
        showToast(error.message || t("unexpected_error_try_again"), "error");
      },
    }
  );

  const onSubmit = (data: FormValues): void => {
    reportWrongAssignment({
      bookingUid,
      correctAssignee: data.correctAssignee || undefined,
      additionalNotes: data.additionalNotes,
    });
  };

  const handleCloseClick = (): void => {
    setIsOpenDialog(false);
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent enableOverflow>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-row space-x-3">
            <div className="w-full">
              <DialogHeader title={t("wrong_assignment")} />

              <RoutingInfoSection
                routingReason={routingReason}
                noRoutingReasonText={t("no_routing_reason")}
                routingReasonLabel={t("routing_reason")}
                guestEmail={guestEmail}
                whoBookedItLabel={t("who_booked_it")}
                hostEmail={hostEmail}
                hostName={hostName}
                whoReceivedItLabel={t("who_received_it")}
                copyToClipboard={copyToClipboard}
                isCopied={isCopied}
              />

              <AssigneeSection
                teamId={teamId}
                teamMemberOptions={teamMemberOptions}
                control={control}
                whoShouldHaveReceivedItLabel={t("who_should_have_received_it")}
                optionalLabel={t("optional")}
                selectTeamMemberPlaceholder={t("select_team_member")}
                enterEmailPlaceholder={t("enter_email")}
              />

              <AdditionalNotesSection
                control={control}
                additionalNotesLabel={t("additional_notes")}
                placeholder={t("wrong_assignment_notes_placeholder")}
                fieldRequiredText={t("field_required")}
                errorMessage={errors.additionalNotes?.message}
              />

              <Alert severity="info" title={t("did_you_know")} message={t("wrong_assignment_crm_info")} />
            </div>
          </div>

          <DialogFooter showDivider className="mt-8">
            <Button type="button" color="secondary" onClick={handleCloseClick} disabled={isPending}>
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
}
