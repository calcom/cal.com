import type { TaskHandler } from "../tasker";

export const revalidateBookingPagesHandler: TaskHandler = async (payload) => {
  const { username, reason } = JSON.parse(payload);

  try {
    const { revalidateUserBookingPages } = await import(
      "../../../../apps/web/app/(booking-page-wrapper)/[user]/[type]/actions"
    );
    await revalidateUserBookingPages(username);
    console.log(`Successfully revalidated booking pages for user: ${username}, reason: ${reason}`);
  } catch (error) {
    console.error(`Failed to revalidate booking pages for user: ${username}`, error);
    throw error;
  }
};
