export interface PlatformLinkParams {
  platformClientId?: string | null;
  platformCancelUrl?: string | null;
  platformRescheduleUrl?: string | null;
  uid: string;
  bookerUrl: string;
  slug?: string;
  username?: string;
  teamId?: number;
  seatReferenceUid?: string;
  isRecurring?: boolean;
}

export interface CancelLinkParams extends PlatformLinkParams {
  cancelledBy?: string | null;
}

export interface RescheduleLinkParams extends PlatformLinkParams {
  rescheduledBy?: string | null;
  allowRescheduleForCancelledBooking?: boolean;
}

export function buildPlatformCancelLink({
  platformCancelUrl,
  uid,
  slug,
  username,
  isRecurring,
  seatReferenceUid,
  teamId,
}: {
  platformCancelUrl: string;
  uid: string | null | undefined;
  slug?: string | null;
  username?: string;
  isRecurring?: boolean;
  seatReferenceUid?: string;
  teamId?: number;
}): string {
  const platformCancelLink = new URL(`${platformCancelUrl}/${uid}`);

  if (slug) {
    platformCancelLink.searchParams.append("slug", slug);
  }
  if (username) {
    platformCancelLink.searchParams.append("username", username);
  }
  platformCancelLink.searchParams.append("cancel", "true");
  platformCancelLink.searchParams.append("allRemainingBookings", String(!!isRecurring));
  if (seatReferenceUid) {
    platformCancelLink.searchParams.append("seatReferenceUid", seatReferenceUid);
  }
  if (teamId) {
    platformCancelLink.searchParams.append("teamId", teamId.toString());
  }

  return platformCancelLink.toString();
}

/**
 * Builds a platform-specific reschedule link with all required query parameters.
 */
export function buildPlatformRescheduleLink({
  platformRescheduleUrl,
  uid,
  slug,
  username,
  seatReferenceUid,
  teamId,
}: {
  platformRescheduleUrl: string;
  uid: string | null | undefined;
  slug?: string | null;
  username?: string;
  seatReferenceUid?: string;
  teamId?: number;
}): string {
  const uidForReschedule = seatReferenceUid || uid;
  const platformRescheduleLink = new URL(`${platformRescheduleUrl}/${uidForReschedule}`);

  if (slug) {
    platformRescheduleLink.searchParams.append("slug", slug);
  }
  if (username) {
    platformRescheduleLink.searchParams.append("username", username);
  }
  platformRescheduleLink.searchParams.append("reschedule", "true");
  if (teamId) {
    platformRescheduleLink.searchParams.append("teamId", teamId.toString());
  }

  return platformRescheduleLink.toString();
}

/**
 * Builds a standard (non-platform) cancel link.
 */
export function buildStandardCancelLink({
  bookerUrl,
  uid,
  cancelledBy,
  seatReferenceUid,
  isRecurring,
}: {
  bookerUrl: string;
  uid: string | null | undefined;
  cancelledBy?: string | null;
  seatReferenceUid?: string;
  isRecurring?: boolean;
}): string {
  const cancelLink = new URL(`${bookerUrl}/booking/${uid}`);
  cancelLink.searchParams.append("cancel", "true");
  cancelLink.searchParams.append("allRemainingBookings", String(!!isRecurring));
  if (cancelledBy) {
    cancelLink.searchParams.append("cancelledBy", cancelledBy);
  }
  if (seatReferenceUid) {
    cancelLink.searchParams.append("seatReferenceUid", seatReferenceUid);
  }
  return cancelLink.toString();
}

/**
 * Builds a standard (non-platform) reschedule link.
 */
export function buildStandardRescheduleLink({
  bookerUrl,
  uid,
  rescheduledBy,
  seatReferenceUid,
  allowRescheduleForCancelledBooking,
}: {
  bookerUrl: string;
  uid: string | null | undefined;
  rescheduledBy?: string | null;
  seatReferenceUid?: string;
  allowRescheduleForCancelledBooking?: boolean;
}): string {
  const uidForReschedule = seatReferenceUid || uid;
  const url = new URL(`${bookerUrl}/reschedule/${uidForReschedule}`);

  if (allowRescheduleForCancelledBooking) {
    url.searchParams.append("allowRescheduleForCancelledBooking", "true");
  }
  if (rescheduledBy) {
    url.searchParams.append("rescheduledBy", rescheduledBy);
  }
  if (seatReferenceUid && rescheduledBy) {
    url.searchParams.append("seatReferenceUid", seatReferenceUid);
  } else if (seatReferenceUid && !rescheduledBy) {
    url.searchParams.append("seatReferenceUid", seatReferenceUid);
  }

  return url.toString();
}

/**
 * Builds a cancel link, using platform URL if available, otherwise standard URL.
 */
export function buildCancelLink(params: CancelLinkParams): string {
  const {
    platformClientId,
    platformCancelUrl,
    uid,
    bookerUrl,
    slug,
    username,
    teamId,
    seatReferenceUid,
    isRecurring,
    cancelledBy,
  } = params;

  if (platformClientId && platformCancelUrl) {
    return buildPlatformCancelLink({
      platformCancelUrl,
      uid,
      slug,
      username,
      isRecurring,
      seatReferenceUid,
      teamId,
    });
  }

  return buildStandardCancelLink({
    bookerUrl,
    uid,
    cancelledBy,
    seatReferenceUid,
    isRecurring,
  });
}

/**
 * Builds a reschedule link, using platform URL if available, otherwise standard URL.
 */
export function buildRescheduleLink(params: RescheduleLinkParams): string {
  const {
    platformClientId,
    platformRescheduleUrl,
    uid,
    bookerUrl,
    slug,
    username,
    teamId,
    seatReferenceUid,
    rescheduledBy,
    allowRescheduleForCancelledBooking,
  } = params;

  if (platformClientId && platformRescheduleUrl) {
    return buildPlatformRescheduleLink({
      platformRescheduleUrl,
      uid,
      slug,
      username,
      seatReferenceUid,
      teamId,
    });
  }

  return buildStandardRescheduleLink({
    bookerUrl,
    uid,
    rescheduledBy,
    seatReferenceUid,
    allowRescheduleForCancelledBooking,
  });
}
