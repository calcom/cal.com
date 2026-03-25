import { Button } from "@calid/features/ui/components/button";
import { Input } from "@calid/features/ui/components/input/input";
import { Label } from "@calid/features/ui/components/label";
import { ArrowLeft, ArrowRight, Loader2, Users } from "lucide-react";
import type { ReactNode } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

interface ScheduleMeetingModalBookingFieldsStepProps {
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  bookingErrorMessage: string | null;
  onBack: () => void;
  onNext: () => void;
  nextDisabled: boolean;
  contactName?: string;
  contactEmail?: string;
  additionalGuests: string;
  onAdditionalGuestsChange: (value: string) => void;
  children: ReactNode;
}

export const ScheduleMeetingModalBookingFieldsStep = ({
  isLoading,
  errorMessage,
  onRetry,
  bookingErrorMessage,
  onBack,
  onNext,
  nextDisabled,
  contactName,
  contactEmail,
  additionalGuests,
  onAdditionalGuestsChange,
  children,
}: ScheduleMeetingModalBookingFieldsStepProps) => {
  const { t } = useLocale();

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label>{t("contacts_booking_fields")}</Label>
        <p className="text-muted-foreground text-xs">
          {t("contacts_fill_booking_details_before_continuing")}
        </p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-3 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("contacts_loading_booking_fields")}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{errorMessage || t("contacts_could_not_load_booking_fields")}</p>
          <Button color="secondary" size="sm" onClick={onRetry}>
            {t("retry")}
          </Button>
        </div>
      ) : null}

      {!isLoading && !errorMessage ? (
        <>
          <div className="max-h-[32vh] overflow-y-auto pr-1">{children}</div>
          {/* <Label>{t("attendees")}</Label> */}
          {/* <div className="bg-muted/50 border-border rounded-lg border p-3">
            <div className="text-sm font-medium">{contactName}</div>
            <div className="text-muted-foreground text-xs">{contactEmail}</div>
          </div> */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {t("contacts_additional_guests")}
            </Label>
            <Input
              value={additionalGuests}
              onChange={(event) => onAdditionalGuestsChange(event.target.value)}
              placeholder={t("contacts_guest_emails_placeholder")}
            />
            <p className="text-muted-foreground text-xs">{t("contacts_separate_emails_with_commas")}</p>
          </div>
        </>
      ) : null}

      {bookingErrorMessage ? <p className="text-xs text-red-600">{bookingErrorMessage}</p> : null}

      <div className="flex justify-between pt-2">
        <Button color="secondary" onClick={onBack}>
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> {t("back")}
        </Button>
        <Button disabled={nextDisabled} onClick={onNext}>
          {t("next")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
