"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import AppNotInstalledMessage from "@calcom/app-store/_components/AppNotInstalledMessage";
import type { IWaylSetupProps } from "@calcom/app-store/waylpayment/pages/setup/_getServerSideProps";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";

export default function WaylSetup(props: IWaylSetupProps) {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useCompatSearchParams();
  const teamId = searchParams?.get("teamId") ? Number(searchParams.get("teamId")) : undefined;

  const integrations = trpc.viewer.apps.integrations.useQuery({ variant: "payment", appId: "waylpayment" });
  const [waylCredentials] = integrations.data?.items || [];
  const [credentialId] = waylCredentials?.userCredentialIds ?? [];
  const showContent = !!integrations.data && integrations.isSuccess && !!credentialId && credentialId > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/integrations/waylpayment/add${teamId ? `?teamId=${teamId}` : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, credentialId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || "Something went wrong", "error");
        return;
      }
      showToast("Wayl API key saved", "success");
      router.push(data.url ?? "/apps/installed/payment");
    } catch {
      showToast("Network error — please try again", "error");
    } finally {
      setLoading(false);
    }
  }

  if (integrations.isPending) {
    return <div className="bg-emphasis absolute z-50 flex h-screen w-full items-center" />;
  }

  return (
    <div className="bg-default flex h-screen items-center justify-center">
      {showContent ? (
        <div className="flex w-full max-w-md flex-col gap-6 p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Connect Wayl</h1>
            <p className="text-subtle mt-2 text-sm">
              Enter your Wayl API key to start accepting payments from Iraqi customers.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="apiKey" className="text-default mb-1 block text-sm font-medium">
                Wayl API Key
              </label>
              <input
                id="apiKey"
                type="password"
                autoComplete="off"
                placeholder="••••••••••••••••"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
                className="border-default bg-default text-default w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none"
              />
            </div>
            <Button type="submit" loading={loading} disabled={!apiKey || loading}>
              {props.hasApiKey ? "Update API Key" : "Connect Wayl"}
            </Button>
          </form>
        </div>
      ) : (
        <AppNotInstalledMessage appName="waylpayment" />
      )}
    </div>
  );
}
