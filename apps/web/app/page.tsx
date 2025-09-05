import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Create a lightweight session check instead of importing heavy auth libs
async function checkSession() {
  try {
    const _cookies = await cookies();
    const sessionCookie = _cookies.get("session") || _cookies.get("next-auth.session-token");
    return !!sessionCookie?.value;
  } catch {
    return false;
  }
}

const RedirectPage = async () => {
  // Simple check - if you need full session data, use the dynamic import version above
  const hasSession = await checkSession();

  if (!hasSession) {
    redirect("/auth/login");
  }
  redirect("/event-types");
};

export default RedirectPage;
