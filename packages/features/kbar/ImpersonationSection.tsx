import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { localStorage } from "@calcom/lib/webstorage";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";

const MAX_RECENT_IMPERSONATIONS = 5;

interface RecentImpersonation {
  username: string;
  timestamp: number;
}

export const ImpersonationSection = () => {
  const { t } = useLocale();
  const [username, setUsername] = useState("");
  const [recentImpersonations, setRecentImpersonations] = useState<RecentImpersonation[]>([]);

  useEffect(() => {
    const storedImpersonations = localStorage.getItem("recentImpersonations");
    if (storedImpersonations) {
      try {
        setRecentImpersonations(JSON.parse(storedImpersonations));
      } catch (e) {
        console.error("Failed to parse recent impersonations", e);
        localStorage.removeItem("recentImpersonations");
      }
    }
  }, []);

  const handleImpersonation = (impersonateUsername: string) => {
    if (!impersonateUsername) return;

    const newImpersonation: RecentImpersonation = {
      username: impersonateUsername,
      timestamp: Date.now(),
    };

    const updatedImpersonations = [
      newImpersonation,
      ...recentImpersonations.filter((item) => item.username !== impersonateUsername),
    ].slice(0, MAX_RECENT_IMPERSONATIONS);

    setRecentImpersonations(updatedImpersonations);
    localStorage.setItem("recentImpersonations", JSON.stringify(updatedImpersonations));

    signIn("impersonation-auth", {
      username: impersonateUsername,
      callbackUrl: `${WEBAPP_URL}/event-types`,
    });
  };

  return (
    <div className="flex flex-col space-y-4 p-4">
      <div className="text-emphasis text-sm font-medium">{t("user_impersonation_heading")}</div>
      <div className="text-subtle text-xs">{t("impersonate_user_tip")}</div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleImpersonation(username);
        }}
        className="flex items-center space-x-2">
        <TextField
          containerClassName="w-full"
          placeholder={t("user")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          type="text"
        />
        <Button type="submit" className="h-9">
          {t("impersonate")}
        </Button>
      </form>

      {recentImpersonations.length > 0 && (
        <div className="mt-4">
          <div className="text-emphasis mb-2 text-sm font-medium">{t("recent_impersonations")}</div>
          <div className="flex flex-col space-y-2">
            {recentImpersonations.map((item) => (
              <button
                key={item.username}
                className="text-emphasis hover:bg-subtle flex items-center justify-between rounded-md px-2 py-1 text-sm"
                onClick={() => handleImpersonation(item.username)}>
                <span>{item.username}</span>
                <span className="text-subtle text-xs">{new Date(item.timestamp).toLocaleDateString()}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
