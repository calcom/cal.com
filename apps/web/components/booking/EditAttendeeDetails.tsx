"use client";

import { TimezoneSelect } from "@calcom/features/components/timezone-select";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { TUpdateAttendeeDetailsInputSchema } from "@calcom/trpc/server/routers/publicViewer/updateAttendeeDetails.schema";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { EmailInput, Input, Label } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { type ChangeEvent, useState } from "react";

type Attendee = {
  email: string;
  name: string;
  phoneNumber?: string | null;
  timeZone: string;
};

type Props = {
  bookingUid: string;
  attendee: Attendee;
  isOpen: boolean;
  onClose: () => void;
};

// Extracted component to reduce complexity of the main modal
function AttendeeFormFields({
  name,
  setName,
  email,
  setEmail,
  phoneNumber,
  setPhoneNumber,
  timeZone,
  setTimeZone,
}: {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phoneNumber: string;
  setPhoneNumber: (v: string) => void;
  timeZone: string;
  setTimeZone: (v: string) => void;
}) {
  const { t } = useLocale();
  return (
    <div className="mt-4 space-y-4">
      <div>
        <Label htmlFor="name">{t("your_name") || "Your name"}</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          className="mt-1"
          placeholder={t("your_name") || "Your name"}
        />
      </div>

      <div>
        <Label htmlFor="email">{t("email_address") || "Email address"}</Label>
        <EmailInput
          id="email"
          name="email"
          value={email}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          className="mt-1"
          placeholder={t("email_address") || "Email address"}
        />
      </div>

      <div>
        <Label htmlFor="phone">{t("phone_number") || "Phone number"}</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={phoneNumber}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setPhoneNumber(e.target.value)}
          className="mt-1"
          placeholder={t("phone_number") || "Phone number"}
        />
      </div>

      <div>
        <Label htmlFor="timezone">{t("timezone") || "Timezone"}</Label>
        <TimezoneSelect
          id="timezone"
          value={timeZone}
          onChange={(event: { value: string } | null) => {
            if (event) setTimeZone(event.value);
          }}
          className="mt-1"
        />
      </div>
    </div>
  );
}

export default function EditAttendeeDetails({ bookingUid, attendee, isOpen, onClose }: Props): JSX.Element {
  const { t } = useLocale();

  const [name, setName] = useState(attendee.name);
  const [email, setEmail] = useState(attendee.email);
  const [phoneNumber, setPhoneNumber] = useState(attendee.phoneNumber ?? "");
  const [timeZone, setTimeZone] = useState(attendee.timeZone);
  const [error, setError] = useState<string | null>(null);

  const mutation = trpc.viewer.public.updateAttendeeDetails.useMutation({
    onSuccess: (_, variables: TUpdateAttendeeDetailsInputSchema) => {
      showToast(t("details_updated_successfully") || "Details updated successfully", "success");
      onClose();

      // Build the new URL with updated email parameter
      const currentUrl = new URL(window.location.href);

      if (variables.email && variables.email !== attendee.email) {
        // If email was changed, update the email param
        currentUrl.searchParams.set("email", variables.email);
      }

      // Full page reload to ensure all data is refreshed
      window.location.href = currentUrl.toString();
    },
    onError: (err: { message: string }) => {
      setError(err.message);
    },
  });

  const handleSubmit = () => {
    setError(null);

    // Check if at least one field has changed
    const hasChanges =
      name !== attendee.name ||
      email !== attendee.email ||
      phoneNumber !== (attendee.phoneNumber ?? "") ||
      timeZone !== attendee.timeZone;

    if (!hasChanges) {
      setError(t("no_changes_made") || "No changes made");
      return;
    }

    // Build update payload with only changed fields
    const updateData: TUpdateAttendeeDetailsInputSchema = {
      bookingUid,
      currentEmail: attendee.email,
    };

    if (name !== attendee.name) updateData.name = name;
    if (email !== attendee.email) updateData.email = email;
    if (phoneNumber !== (attendee.phoneNumber ?? "")) updateData.phoneNumber = phoneNumber;
    if (timeZone !== attendee.timeZone) updateData.timeZone = timeZone;

    mutation.mutate(updateData);
  };

  const handleClose = () => {
    // Reset to original values on close
    setName(attendee.name);
    setEmail(attendee.email);
    setPhoneNumber(attendee.phoneNumber ?? "");
    setTimeZone(attendee.timeZone);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col">
          <DialogHeader
            title={t("edit_your_details") || "Edit your details"}
            subtitle={t("update_your_booking_information") || "Update your booking information"}
          />

          <AttendeeFormFields
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            phoneNumber={phoneNumber}
            setPhoneNumber={setPhoneNumber}
            timeZone={timeZone}
            setTimeZone={setTimeZone}
          />

          {error && (
            <div className="mt-4 flex items-center gap-x-2 text-sm text-red-700">
              <Icon name="info" className="h-4 w-4" />
              <p>{error}</p>
            </div>
          )}

          <DialogFooter className="mt-6" noSticky>
            <DialogClose color="secondary" onClick={handleClose}>
              {t("cancel")}
            </DialogClose>
            <Button color="primary" onClick={handleSubmit} loading={mutation.isPending}>
              {t("save")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
