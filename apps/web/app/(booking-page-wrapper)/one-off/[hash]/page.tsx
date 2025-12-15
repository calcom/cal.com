import { CustomI18nProvider } from "app/CustomI18nProvider";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { OneOffBookerWrapper } from "@calcom/features/one-off-meetings/components";
import type { OneOffMeetingData } from "@calcom/features/one-off-meetings/components";
import { loadTranslations } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import { OneOffMeetingStatus } from "@calcom/prisma/enums";

export const generateMetadata = async ({ params }: PageProps) => {
  const { hash } = await params;

  const oneOffMeeting = await prisma.oneOffMeeting.findUnique({
    where: { linkHash: hash as string },
    select: {
      title: true,
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!oneOffMeeting) {
    return _generateMetadata(
      () => "Not Found",
      () => "This one-off meeting link was not found"
    );
  }

  return _generateMetadata(
    () => `${oneOffMeeting.title} | ${oneOffMeeting.user.name}`,
    () => `Book a one-off meeting with ${oneOffMeeting.user.name}`
  );
};

async function getOneOffMeetingData(hash: string): Promise<OneOffMeetingData | null> {
  const oneOffMeeting = await prisma.oneOffMeeting.findUnique({
    where: { linkHash: hash },
    select: {
      id: true,
      title: true,
      description: true,
      duration: true,
      location: true,
      timeZone: true,
      linkHash: true,
      status: true,
      offeredSlots: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
        },
        orderBy: {
          startTime: "asc",
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
          timeZone: true,
          weekStart: true,
          hideBranding: true,
          locale: true,
          theme: true,
        },
      },
    },
  });

  if (!oneOffMeeting) {
    return null;
  }

  // Check if the meeting is still active
  if (oneOffMeeting.status !== OneOffMeetingStatus.ACTIVE) {
    return {
      ...oneOffMeeting,
      error:
        oneOffMeeting.status === OneOffMeetingStatus.BOOKED
          ? "This meeting has already been booked"
          : oneOffMeeting.status === OneOffMeetingStatus.EXPIRED
          ? "This meeting link has expired"
          : "This meeting link is no longer available",
    };
  }

  // Filter out slots that are in the past
  const now = new Date();
  const availableSlots = oneOffMeeting.offeredSlots.filter((slot) => new Date(slot.startTime) > now);

  if (availableSlots.length === 0) {
    return {
      ...oneOffMeeting,
      offeredSlots: [],
      error: "All time slots for this meeting have passed",
    };
  }

  return {
    ...oneOffMeeting,
    offeredSlots: availableSlots,
    error: null,
  };
}

async function getLocaleFromHeaders(): Promise<string> {
  const headersList = await headers();
  const acceptLanguage = headersList.get("accept-language");
  if (acceptLanguage) {
    const locale = acceptLanguage.split(",")[0].split("-")[0];
    return locale || "en";
  }
  return "en";
}

export default async function Page({ params }: PageProps) {
  const { hash } = await params;

  const data = await getOneOffMeetingData(hash as string);

  if (!data) {
    notFound();
  }

  // If there's an error (meeting booked, expired, etc.), show an error page
  if (data.error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">{data.error}</h1>
          <p className="mt-2 text-gray-600">Please contact the meeting organizer for a new link.</p>
        </div>
      </div>
    );
  }

  // Get locale from user preference or browser
  const locale = (data.user as { locale?: string | null }).locale || (await getLocaleFromHeaders());
  const ns = "common";
  const translations = await loadTranslations(locale, ns);

  return (
    <CustomI18nProvider translations={translations} locale={locale} ns={ns}>
      <OneOffBookerWrapper data={data} />
    </CustomI18nProvider>
  );
}
