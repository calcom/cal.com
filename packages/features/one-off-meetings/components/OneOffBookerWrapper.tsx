"use client";

import Link from "next/link";
import { useState, useMemo } from "react";

import dayjs from "@calcom/dayjs";
import PoweredBy from "@calcom/features/ee/components/PoweredBy";
import { useTimePreferences } from "@calcom/features/bookings/lib/timePreferences";
import { WEBSITE_TERMS_URL, WEBSITE_PRIVACY_POLICY_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { Button } from "@calcom/ui/components/button";
import { TextField, TextAreaField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

import type { OneOffMeetingData } from "./types";

export interface OneOffBookerWrapperProps {
  data: OneOffMeetingData;
}

type BookingStep = "selecting_time" | "entering_details";

/**
 * Group slots by date for display
 */
function groupSlotsByDate(
  slots: { id: string; startTime: Date | string; endTime: Date | string }[]
): Record<string, { id: string; time: string; startTime: string }[]> {
  const grouped: Record<string, { id: string; time: string; startTime: string }[]> = {};

  for (const slot of slots) {
    const startTime = typeof slot.startTime === "string" ? slot.startTime : slot.startTime.toISOString();
    const dateKey = dayjs(startTime).format("YYYY-MM-DD");
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push({
      id: slot.id,
      time: startTime,
      startTime,
    });
  }

  // Sort slots within each day
  for (const dateKey of Object.keys(grouped)) {
    grouped[dateKey].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }

  return grouped;
}

/**
 * EventMetaBlock - matches the pattern from Booker's EventMeta
 */
function EventMetaBlock({
  icon,
  children,
  className,
}: {
  icon: "clock" | "calendar" | "globe" | "map-pin";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`text-text flex items-start justify-start text-sm ${className || ""}`}>
      <Icon name={icon} className="text-subtle mr-2 mt-[2px] h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function OneOffBookerWrapper({ data }: OneOffBookerWrapperProps) {
  const { t } = useLocale();
  const { timeFormat, timezone } = useTimePreferences();
  
  // Apply user's booking page theme setting
  useTheme(data.user.theme);

  // State
  const [step, setStep] = useState<BookingStep>("selecting_time");
  const [selectedSlot, setSelectedSlot] = useState<{ id: string; time: string } | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isBooking, setIsBooking] = useState(false);

  // Group slots by date
  const slotsByDate = useMemo(() => groupSlotsByDate(data.offeredSlots), [data.offeredSlots]);
  const sortedDates = useMemo(
    () => Object.keys(slotsByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()),
    [slotsByDate]
  );

  const formatTime = (time: string) => {
    return dayjs(time).tz(timezone).format(timeFormat);
  };

  const formatDate = (dateStr: string) => {
    return dayjs(dateStr).format("dddd, MMMM D, YYYY");
  };

  const formatFromToTime = (time: string) => {
    const start = dayjs(time).tz(timezone);
    const end = start.add(data.duration, "minute");
    return `${start.format(timeFormat)} - ${end.format(timeFormat)}`;
  };

  const handleSlotSelect = (slotId: string, time: string) => {
    setSelectedSlot({ id: slotId, time });
    setStep("entering_details");
  };

  const handleBack = () => {
    if (step === "entering_details") {
      setStep("selecting_time");
    }
  };

  const handleBook = async () => {
    if (!selectedSlot) return;

    if (!name.trim() || !email.trim()) {
      showToast(t("please_fill_required_fields") || "Please fill in required fields", "error");
      return;
    }

    setIsBooking(true);
    try {
      const response = await fetch("/api/book/one-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oneOffMeetingId: data.id,
          slotId: selectedSlot.id,
          name: name.trim(),
          email: email.trim(),
          notes: notes.trim() || undefined,
          timeZone: timezone,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Booking failed");
      }

      showToast(t("booking_confirmed") || "Booking confirmed!", "success");
      window.location.href = `/booking/${result.uid}?isSuccessBookingPage=true`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Booking failed";
      showToast(message, "error");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="bg-subtle dark:bg-default flex min-h-screen items-center justify-center p-4">
      <div className="flex flex-col items-center">
        {/* Main container - matches Booker grid layout */}
        <div
          className="bg-default dark:bg-cal-muted border-subtle grid max-w-full items-start rounded-md border"
          style={
            {
              gridTemplateColumns: "var(--booker-meta-width) var(--booker-main-width)",
              "--booker-meta-width": "340px",
              "--booker-main-width": "420px",
            } as React.CSSProperties
          }>
        {/* Left sidebar - Event Meta */}
        <div className="relative z-10 p-6" data-testid="event-meta">
          {/* Host info - EventMembers style */}
          <div className="mb-2 flex items-center gap-2">
            {data.user.avatarUrl ? (
              <img src={data.user.avatarUrl} alt={data.user.name || ""} className="h-6 w-6 rounded-full" />
            ) : (
              <div className="bg-subtle flex h-6 w-6 items-center justify-center rounded-full">
                <Icon name="user" className="text-default h-3 w-3" />
              </div>
            )}
            <span className="text-subtle text-sm">{data.user.name}</span>
          </div>

          {/* Event title - EventTitle style */}
          <h1 className="text-emphasis my-2 text-xl font-semibold" data-testid="event-title">
            {data.title}
          </h1>

          {/* Description */}
          {data.description && (
            <div className="text-text mb-8 max-h-[180px] max-w-full overflow-y-auto pr-4 text-sm">
              {data.description}
            </div>
          )}

          {/* Event details - stack-y-4 pattern */}
          <div className="space-y-4 font-medium rtl:-mr-2">
            {/* Selected time - show when slot is selected */}
            {selectedSlot && (
              <EventMetaBlock icon="calendar">
                <div>{formatDate(dayjs(selectedSlot.time).format("YYYY-MM-DD"))}</div>
                <div>{formatFromToTime(selectedSlot.time)}</div>
              </EventMetaBlock>
            )}

            {/* Duration */}
            <EventMetaBlock icon="clock">
              {data.duration} {t("minutes") || "minutes"}
            </EventMetaBlock>

            {/* Timezone */}
            <EventMetaBlock icon="globe">{timezone}</EventMetaBlock>
          </div>
        </div>

        {/* Right section - Form or Slots */}
        <div className="border-subtle sticky top-0 h-full border-l p-6">
          {step === "selecting_time" && (
            <div className="flex h-full flex-col">
              <h2 className="text-emphasis mb-4 text-base font-semibold">
                {t("select_time_slot") || "Select a Time"}
              </h2>

              <div className="flex-1 space-y-6 overflow-y-auto">
                {sortedDates.map((dateKey) => (
                  <div key={dateKey}>
                    <h3 className="text-emphasis mb-3 text-sm font-medium">{formatDate(dateKey)}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {slotsByDate[dateKey].map((slot) => (
                        <Button
                          key={slot.id}
                          color="secondary"
                          className="justify-center"
                          onClick={() => handleSlotSelect(slot.id, slot.time)}>
                          {formatTime(slot.time)}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === "entering_details" && selectedSlot && (
            <div className="flex h-full flex-col">
              {/* Form fields with mb-4 spacing */}
              <div className="mb-4">
                <TextField
                  name="name"
                  label={
                    <>
                      {t("your_name") || "Your Name"}
                      <span className="text-emphasis ml-1 text-sm font-medium">*</span>
                    </>
                  }
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="John Doe"
                />
              </div>

              <div className="mb-4">
                <TextField
                  name="email"
                  label={
                    <>
                      {t("email_address") || "Email address"}
                      <span className="text-emphasis ml-1 text-sm font-medium">*</span>
                    </>
                  }
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="john@example.com"
                />
              </div>

              <div className="mb-4">
                <TextAreaField
                  name="notes"
                  label={t("additional_notes") || "Additional notes"}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    t("share_additional_notes") || "Please share anything that will help prepare for our meeting."
                  }
                  rows={3}
                />
              </div>

              {/* Terms and Privacy Policy */}
              <div className="text-subtle my-3 w-full text-xs">
                By proceeding, you agree to our{" "}
                <Link className="text-emphasis hover:underline" href={WEBSITE_TERMS_URL} target="_blank">
                  Terms
                </Link>{" "}
                and{" "}
                <Link className="text-emphasis hover:underline" href={WEBSITE_PRIVACY_POLICY_URL} target="_blank">
                  Privacy Policy
                </Link>
                .
              </div>

              {/* Button row - matches Booker pattern */}
              <div className="mt-auto flex justify-end space-x-2 rtl:space-x-reverse">
                <Button color="minimal" type="button" onClick={handleBack} data-testid="back">
                  {t("back") || "Back"}
                </Button>
                <Button
                  color="primary"
                  onClick={handleBook}
                  disabled={!name.trim() || !email.trim()}
                  loading={isBooking}
                  data-testid="confirm-book-button">
                  {t("confirm") || "Confirm"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

        {/* Cal.com logo - centered below modal */}
        {!data.user.hideBranding && (
          <div className="mt-6 [&_img]:h-[15px]">
            <PoweredBy logoOnly />
          </div>
        )}
      </div>
    </div>
  );
}
