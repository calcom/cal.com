import { redirect } from "next/navigation";

/**
 * Lightweight root page redirect.
 *
 * This page intentionally avoids importing heavy server-side dependencies
 * (like Prisma, session handlers) to keep Turbopack compile times fast.
 *
 * Authentication and onboarding checks are handled by:
 * - /event-types page (for logged-in users)
 * - NextAuth middleware (redirects to /auth/login if not authenticated)
 */
const RedirectPage = () => {
  redirect("/event-types");
};

export default RedirectPage;
