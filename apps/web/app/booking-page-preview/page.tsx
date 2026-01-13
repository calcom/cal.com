"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useEffect } from "react";

import { buildAppearanceCssVars, buildGoogleFontsUrl } from "@calcom/features/booking-page-appearance";
import type { BookingPageAppearance } from "@calcom/prisma/zod-utils";

function BookingPagePreviewContent() {
  const searchParams = useSearchParams();

  const appearance = useMemo(() => {
    const appearanceParam = searchParams?.get("appearance");
    if (!appearanceParam) return null;
    try {
      return JSON.parse(decodeURIComponent(appearanceParam)) as BookingPageAppearance;
    } catch {
      return null;
    }
  }, [searchParams]);

  const brandColor = searchParams?.get("brandColor") || "#111827";

  const cssString = useMemo(() => {
    if (!appearance) return "";
    return buildAppearanceCssVars(appearance, brandColor);
  }, [appearance, brandColor]);

  const googleFontsUrl = useMemo(() => {
    if (!appearance) return null;
    return buildGoogleFontsUrl(appearance);
  }, [appearance]);

  useEffect(() => {
    if (cssString) {
      const styleEl = document.getElementById("booking-page-appearance-preview");
      if (styleEl) {
        styleEl.textContent = cssString;
      } else {
        const newStyleEl = document.createElement("style");
        newStyleEl.id = "booking-page-appearance-preview";
        newStyleEl.textContent = cssString;
        document.head.appendChild(newStyleEl);
      }
    }
  }, [cssString]);

  useEffect(() => {
    if (googleFontsUrl) {
      const existingLink = document.getElementById("booking-page-appearance-fonts");
      if (existingLink) {
        existingLink.setAttribute("href", googleFontsUrl);
      } else {
        const linkEl = document.createElement("link");
        linkEl.id = "booking-page-appearance-fonts";
        linkEl.rel = "stylesheet";
        linkEl.href = googleFontsUrl;
        document.head.appendChild(linkEl);
      }
    }
  }, [googleFontsUrl]);

  return (
    <div className="bg-default flex min-h-screen items-center justify-center p-4">
      <div className="border-subtle w-full max-w-[400px] rounded-lg border bg-white p-6 shadow-lg">
        <div className="mb-6 flex items-center gap-4">
          <div className="bg-subtle h-12 w-12 rounded-full" />
          <div>
            <h2 className="text-emphasis text-lg font-semibold">John Doe</h2>
            <p className="text-subtle text-sm">30 Min Meeting</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-emphasis mb-3 text-sm font-medium">Select a Date</h3>
          <div className="grid grid-cols-7 gap-1">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
              <div key={i} className="text-subtle py-1 text-center text-xs font-medium">
                {day}
              </div>
            ))}
            {Array.from({ length: 21 }, (_, i) => {
              const isSelected = i === 8;
              const isToday = i === 5;
              return (
                <div
                  key={i}
                  className={`rounded-md py-2 text-center text-sm ${
                    isSelected
                      ? "bg-brand-default text-inverted font-medium"
                      : isToday
                        ? "text-emphasis font-medium"
                        : "text-default hover:bg-subtle"
                  }`}>
                  {i + 1}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-emphasis mb-3 text-sm font-medium">Select a Time</h3>
          <div className="space-y-2">
            {["9:00am", "10:00am", "11:00am", "2:00pm"].map((time, i) => (
              <button
                key={time}
                type="button"
                className={`border-subtle text-emphasis w-full rounded-md border py-3 text-center text-sm font-medium transition-colors ${
                  i === 1 ? "bg-brand-default text-inverted border-transparent" : "hover:border-emphasis"
                }`}>
                {time}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="bg-brand-default text-inverted w-full rounded-md py-3 text-center text-sm font-medium">
          Confirm Booking
        </button>
      </div>
    </div>
  );
}

export default function BookingPagePreview() {
  return <BookingPagePreviewContent />;
}
