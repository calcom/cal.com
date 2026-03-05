import { redirect } from "next/navigation";

/**
 * Agent Cal OAuth landing.
 * Redirects to the Cal.com OAuth2 authorize page with the same query params,
 * so the CLI (or agent.cal.com) can use this URL for a branded entry point.
 * Example: /agent/oauth?client_id=agent-cal&redirect_uri=http://localhost:9876/callback&...
 */
export default async function AgentOAuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      query.set(key, Array.isArray(value) ? value[0] : value);
    }
  }
  const queryString = query.toString();
  redirect(queryString ? `/auth/oauth2/authorize?${queryString}` : "/auth/oauth2/authorize");
}
