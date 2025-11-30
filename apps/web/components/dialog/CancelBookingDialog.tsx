import { useCallback, useState } from "react";

import { shouldChargeNoShowCancellationFee } from "@calcom/features/bookings/lib/payment/shouldChargeNoShowCancellationFee";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRefreshData } from "@calcom/lib/hooks/useRefreshData";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Label, Select, TextArea, CheckboxField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

import type { BookingItemProps } from "../booking/types";

interface CancelBookingDialogProps {
  isOpenDialog: boolean;
  setIsOpenDialog: (isOpen: boolean) => void;
  booking: BookingItemProps;
  isHost: boolean;
  allRemainingBookings: boolean;
  seatReferenceUid?: string;
}

const InternalNotePresetsSelect = ({
  internalNotePresets,
  onPresetSelect,
  setCancellationReason,
}: {
  internalNotePresets: { id: number; name: string }[];
  onPresetSelect: (
    option: {
      value: number | string;
      label: string;
    } | null
  ) => void;
  setCancellationReason: (reason: string) => void;
}) => {
  const { t } = useLocale();
  const [showOtherInput, setShowOtherInput] = useState(false);

  if (!internalNotePresets?.length) {
    return null;
  }

  const handleSelectChange = (option: { value: number | string; label: string } | null) => {
    if (option?.value === "other") {
      setShowOtherInput(true);
      setCancellationReason("");
    } else {
      setShowOtherInput(false);
      onPresetSelect && onPresetSelect(option);
    }
  };

  return (
    <div className="mb-4 flex flex-col">
      <Label>{t("internal_booking_note")}</Label>
      <Select
        className="mb-2"
        options={[
          ...internalNotePresets?.map((preset) => ({
            label: preset.name,
            value: preset.id,
          })),
          { label: t("other"), value: "other" },
        ]}
        onChange={handleSelectChange}
        placeholder={t("internal_booking_note")}
      />
      {showOtherInput && (
        <TextArea
          rows={3}
          placeholder={t("internal_booking_note_description")}
          onChange={(e) => onPresetSelect?.({ value: "other", label: e.target.value })}
        />
      )}
    </div>
  );
};

export const CancelBookingDialog = ({
  isOpenDialog,
  setIsOpenDialog,
  booking,
  isHost,
  allRemainingBookings,
  seatReferenceUid,
}: CancelBookingDialogProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const refreshData = useRefreshData();

  const [cancellationReason, setCancellationReason] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalNote, setInternalNote] = useState<{ id: number; name: string } | null>(null);
  const [acknowledgeCancellationNoShowFee, setAcknowledgeCancellationNoShowFee] = useState(false);

  const currentUserEmail = booking.loggedInUser.userEmail;

  // Fetch internal note presets only if host and team booking
  const teamId = booking.eventType?.team?.id;
  const { data: internalNotePresets = [] } = trpc.viewer.teams.getInternalNotesPresets.useQuery(
    { teamId: teamId! },
    { enabled: isHost && !!teamId }
  );

  const getAppMetadata = (appId: string): Record<string, unknown> | null => {
    if (!booking.eventType?.metadata?.apps || !appId) return null;
    const apps = booking.eventType.metadata.apps as Record<string, unknown>;
    return (apps[appId] as Record<string, unknown>) || null;
  };

  // BookingItemProps payment doesn't have appId, so we get it from eventType metadata
  const paymentAppData = booking.payment?.[0];
  const appId = booking.eventType?.metadata?.apps
    ? Object.keys(booking.eventType.metadata.apps as Record<string, unknown>)[0]
    : null;

  const timeValue = appId
    ? (getAppMetadata(appId) as Record<string, unknown> | null)?.autoChargeNoShowFeeTimeValue
    : null;
  const timeUnit = appId
    ? (getAppMetadata(appId) as Record<string, unknown> | null)?.autoChargeNoShowFeeTimeUnit
    : null;

  // Determine organizer from booking.user
  const organizer = booking.user;
  const isCancellationUserHost = isHost || organizer?.email === currentUserEmail;

  const autoChargeNoShowFee = () => {
    if (isCancellationUserHost) return false; // Hosts/organizers are exempt

    if (!booking.startTime) return false;

    if (!paymentAppData) return false;

    return shouldChargeNoShowCancellationFee({
      eventTypeMetadata: booking.eventType?.metadata || null,
      booking: {
        startTime: new Date(booking.startTime),
      },
      payment: { ...paymentAppData, appId },
    });
  };

  const cancellationNoShowFeeWarning = autoChargeNoShowFee();

  const hostMissingCancellationReason =
    isCancellationUserHost &&
    (!cancellationReason?.trim() || (internalNotePresets.length > 0 && !internalNote?.id));
  const cancellationNoShowFeeNotAcknowledged =
    !isCancellationUserHost && cancellationNoShowFeeWarning && !acknowledgeCancellationNoShowFee;

  const cancelBookingRef = useCallback((node: HTMLTextAreaElement) => {
    if (node !== null) {
      node.scrollIntoView({ behavior: "smooth" });
      node.focus();
    }
  }, []);

  const handleCancel = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/csrf?sameSite=none", { cache: "no-store" });
      const { csrfToken } = await response.json();

      const res = await fetch("/api/cancel", {
        body: JSON.stringify({
          uid: booking.uid,
          cancellationReason: cancellationReason,
          allRemainingBookings,
          seatReferenceUid,
          cancelledBy: currentUserEmail,
          internalNote: internalNote,
          csrfToken,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (res.status >= 200 && res.status < 300) {
        showToast(
          allRemainingBookings ? t("booking_cancelled_all_remaining") : t("booking_cancelled"),
          "success"
        );
        setIsOpenDialog(false);
        await utils.viewer.bookings.invalidate();
        refreshData();
      } else {
        const data = await res.json();
        setError(
          data.message ||
            `${t("error_with_status_code_occured", { status: res.status })} ${t("please_try_again")}`
        );
      }
    } catch (err) {
      setError(t("something_went_wrong"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent enableOverflow>
        <DialogHeader
          title={allRemainingBookings ? t("cancel_all_remaining") : t("cancel_event")}
          subtitle={t("cancellation_reason_description")}
        />

        {error && (
          <div className="mb-4">
            <div className="bg-error mx-auto flex h-12 w-12 items-center justify-center rounded-full">
              <Icon name="x" className="h-6 w-6 text-red-600" />
            </div>
            <div className="mt-3 text-center">
              <h3 className="text-emphasis text-lg font-medium leading-6">{error}</h3>
            </div>
          </div>
        )}

        {!error && (
          <div>
            {isHost && internalNotePresets.length > 0 && (
              <InternalNotePresetsSelect
                internalNotePresets={internalNotePresets}
                setCancellationReason={setCancellationReason}
                onPresetSelect={(option) => {
                  if (!option) return;

                  if (option.value === "other") {
                    setInternalNote({ id: -1, name: option.label });
                  } else {
                    const foundInternalNote = internalNotePresets.find(
                      (preset) => preset.id === Number(option.value)
                    );
                    if (foundInternalNote) {
                      setInternalNote(foundInternalNote);
                      setCancellationReason(
                        (foundInternalNote as { cancellationReason?: string | null }).cancellationReason || ""
                      );
                    }
                  }
                }}
              />
            )}

            <Label>{isCancellationUserHost ? t("cancellation_reason_host") : t("cancellation_reason")}</Label>

            <TextArea
              data-testid="cancel_reason"
              ref={cancelBookingRef}
              placeholder={t("cancellation_reason_placeholder")}
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="mb-4 mt-2 w-full"
              rows={3}
            />

            {isCancellationUserHost && (
              <div className="-mt-2 mb-4 flex items-center gap-2">
                <Icon name="info" className="text-subtle h-4 w-4" />
                <p className="text-default text-subtle text-sm leading-none">
                  {t("notify_attendee_cancellation_reason_warning")}
                </p>
              </div>
            )}

            {cancellationNoShowFeeWarning && booking.payment?.[0] && (
              <div>
                <div className="bg-attention mb-5 rounded-md p-3">
                  <CheckboxField
                    description={t("cancel_booking_acknowledge_no_show_fee", {
                      timeValue,
                      timeUnit,
                      amount: booking.payment[0].amount / 100,
                      formatParams: { amount: { currency: booking.payment[0].currency } },
                    })}
                    onChange={(e) => setAcknowledgeCancellationNoShowFee(e.target.checked)}
                    descriptionClassName="text-info font-semibold"
                  />
                  <p className="text-subtle ml-9 mt-2 text-sm">{t("contact_organizer")}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button color="secondary" onClick={() => setIsOpenDialog(false)}>
            {t("nevermind")}
          </Button>
          <Button
            data-testid="confirm_cancel"
            disabled={hostMissingCancellationReason || cancellationNoShowFeeNotAcknowledged || loading}
            onClick={handleCancel}
            loading={loading}>
            {allRemainingBookings ? t("cancel_all_remaining") : t("cancel_event")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
