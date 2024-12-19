"use client";

import type { SubmenuOptions } from "@crabnebula/taurify-api/menu";
import { Menu } from "@crabnebula/taurify-api/menu";
import { getCurrentWebviewWindow } from "@crabnebula/taurify-api/tauri/webviewWindow";
import { TrayIcon } from "@crabnebula/taurify-api/tray";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";

import useMeQuery from "@lib/hooks/useMeQuery";

async function focusAppWindow() {
  const appWindow = getCurrentWebviewWindow();
  appWindow.show();
  appWindow.setFocus();
}

type RouterInstance = ReturnType<typeof useRouter>;
type BookingOutput = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][0];

const getSeatReferenceUid = (booking: BookingOutput) => {
  if (!booking.seatsReferences[0]) {
    return undefined;
  }
  return booking.seatsReferences[0].referenceUid;
};

function bookingMenuItem(t: ReturnType<typeof useLocale>["t"], router: RouterInstance) {
  return (booking: BookingOutput): SubmenuOptions => ({
    text: booking.title,
    items: [
      {
        text: t("cancel_event"),
        action: async () => {
          const isRecurring = booking.recurringEventId !== null;
          router.push(`/booking/${booking.uid}?cancel=true${isRecurring ? "&allRemainingBookings=true" : ""}${
            booking.seatsReferences.length ? `&seatReferenceUid=${getSeatReferenceUid(booking)}` : ""
          }
            `);

          await focusAppWindow();
        },
      },
      {
        text: t("reschedule_booking"),
        action: async () => {
          router.push(
            `/reschedule/${booking.uid}${
              booking.seatsReferences.length ? `?seatReferenceUid=${getSeatReferenceUid(booking)}` : ""
            }`
          );

          await focusAppWindow();
        },
      },
    ],
  });
}

export function TrayIconComponent() {
  const user = useMeQuery().data;

  const query = trpc.viewer.bookings.get.useInfiniteQuery(
    {
      limit: 10,
      filters: {
        status: "upcoming",
      },
    },
    {
      // first render has status `undefined`
      enabled: true,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );
  const upcoming10Today = query.data?.pages.map((page) =>
    page.bookings.filter((booking: BookingOutput) => {
      return (
        dayjs(booking.startTime).tz(user?.timeZone).format("YYYY-MM-DD") ===
        dayjs().tz(user?.timeZone).format("YYYY-MM-DD")
      );
    })
  )[0];

  const router = useRouter();
  const { t } = useLocale();

  useEffect(() => {
    async function updateTray() {
      const trayIcon = await TrayIcon.getById("main");

      const menu = await Menu.new({
        items: user?.id ? (upcoming10Today || []).map(bookingMenuItem(t, router)) : [],
      });

      await trayIcon?.setMenu(menu);
    }

    if (typeof window !== "undefined" && "__TAURIFY__" in window && user?.id) {
      updateTray().catch(console.error);
    }
  }, [t, router, upcoming10Today, user]);

  return null;
}
