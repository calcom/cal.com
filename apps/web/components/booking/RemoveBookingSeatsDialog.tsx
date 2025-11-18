import { useState } from "react";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";
import { Form, TextAreaField, MultiSelectCheckbox } from "@calcom/ui/components/form";
import type { MultiSelectCheckboxesOptionType as Option } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import type { BookingItemProps } from "./types";

interface RemoveBookingSeatsDialogProps {
  booking: BookingItemProps;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormValues {
  cancellationReason: string;
}

export function RemoveBookingSeatsDialog({
  booking,
  isOpen,
  onClose,
  onSuccess,
}: RemoveBookingSeatsDialogProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [selected, setSelected] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      cancellationReason: "",
    },
  });

  // Determine if user is just an attendee (not organizer/admin)
  // If they're just an attendee, they should only see their own seat for privacy
  const userEmail = booking.loggedInUser?.userEmail;
  const isUserOrganizer = userEmail === booking.user?.email;

  // Check if user is just an attendee (has a seat but is not organizer)
  // If user has a seat but is NOT the organizer, they're likely just an attendee
  // Team admins/owners who aren't attendees won't have a seat, so they'll see all seats
  // Backend will enforce permissions when they try to remove seats
  const userSeat = userEmail
    ? booking.seatsReferences?.find((seat) => seat.attendee?.email === userEmail)
    : null;
  const isJustAttendee = !!userSeat && !isUserOrganizer;

  // Build options from seat references
  // seatsReferences structure: { referenceUid: string, attendee: { email: string, name: string } | null }
  // For team admins/owners who aren't attendees, all seats should still be visible
  // Backend now includes attendee.name in the query, so we can use it directly
  const allSeatOptions = (booking.seatsReferences || [])
    .map((seatRef) => {
      if (!seatRef?.referenceUid) return null;

      const attendee = seatRef.attendee;
      const attendeeName = attendee?.name;
      const attendeeEmail = attendee?.email;

      // If user is just an attendee, only show their own seat (hide other attendees' info)
      if (isJustAttendee) {
        // Only include this seat if it's the user's own seat
        if (seatRef.referenceUid !== userSeat?.referenceUid) {
          return null;
        }
        // For their own seat, show their name and email (they can see their own info)
        if (attendeeName && attendeeEmail) {
          return {
            value: seatRef.referenceUid,
            label: `${attendeeName} (${attendeeEmail})`,
          };
        } else if (attendeeEmail) {
          return {
            value: seatRef.referenceUid,
            label: attendeeEmail,
          };
        } else if (attendeeName) {
          return {
            value: seatRef.referenceUid,
            label: attendeeName,
          };
        }
        // If no attendee info available, filter out this seat
        return null;
      }

      // For organizers/admins: show full attendee info
      let label: string;
      if (attendeeName && attendeeEmail) {
        label = `${attendeeName} (${attendeeEmail})`;
      } else if (attendeeEmail) {
        label = attendeeEmail;
      } else if (attendeeName) {
        label = attendeeName;
      } else {
        // Fallback: use referenceUid if no attendee info available
        label = `Seat ${seatRef.referenceUid.slice(0, 8)}...`;
      }

      return {
        value: seatRef.referenceUid,
        label: label,
      };
    })
    .filter(Boolean) as Option[];

  const seatOptions = allSeatOptions;

  const onSubmit = async (data: FormValues) => {
    if (selected.length === 0) {
      showToast(t("please_select_at_least_one_seat"), "error");
      return;
    }

    // Allow removing all seats - booking will remain active with 0 attendees

    setLoading(true);

    try {
      // Extract values from selected options
      const seatReferenceUids = selected.map((option) => option.value);

      // Get CSRF token
      const response = await fetch("/api/csrf?sameSite=none", { cache: "no-store" });
      const { csrfToken } = await response.json();

      // Call the cancel API
      const res = await fetch("/api/cancel", {
        body: JSON.stringify({
          uid: booking.uid,
          seatReferenceUids: seatReferenceUids,
          cancellationReason: data.cancellationReason,
          csrfToken,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (res.status >= 200 && res.status < 300) {
        showToast(t("seats_removed_successfully"), "success");
        await utils.viewer.bookings.invalidate();
        onSuccess();
        onClose();
        form.reset();
        setSelected([]);
      } else {
        let errorMessage = t("error_removing_seats");
        try {
          const responseText = await res.text();
          try {
            const error = JSON.parse(responseText);
            errorMessage = error.message || errorMessage;
          } catch {
            console.error("Failed to parse error response as JSON. Raw response:", responseText);
            errorMessage = responseText.trim() || errorMessage;
          }
        } catch {
          console.error("Failed to read error response. Status:", res.status);
        }
        showToast(errorMessage, "error");
      }
    } catch {
      showToast(t("error_removing_seats"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        title={t("remove_seats")}
        description={t("remove_seats_description")}
        type="creation"
        className="max-w-lg">
        <Form form={form} handleSubmit={onSubmit}>
          <div className="space-y-4">
            <div>
              <label className="text-default mb-2 block text-sm font-medium">
                {t("select_seats_to_remove")}
              </label>
              {seatOptions.length === 0 ? (
                <div className="text-muted text-sm">{t("no_seats_available_to_remove")}</div>
              ) : (
                <MultiSelectCheckbox
                  options={seatOptions}
                  selected={selected}
                  setSelected={setSelected}
                  setValue={(options) => {
                    setSelected(options);
                  }}
                  countText="count_selected"
                  className="w-full text-sm"
                />
              )}
            </div>

            <TextAreaField
              label={t("removal_reason_optional")}
              placeholder={t("removal_reason_placeholder")}
              {...form.register("cancellationReason")}
            />
          </div>

          <DialogFooter>
            <DialogClose />
            <Button type="submit" loading={loading} disabled={loading || selected.length === 0}>
              {t("remove_selected_seats")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
