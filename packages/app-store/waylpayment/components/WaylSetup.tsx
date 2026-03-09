/**
 * components/WaylSetup.tsx
 *
 * The "Connect Wayl" screen shown in the Cal.com App Store when a user
 * clicks "Install" on the Wayl app. Prompts for their API key.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WaylSetup() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/integrations/waylpayment/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Something went wrong");
        return;
      }

      // Redirect to installed apps page
      router.push(data.url ?? "/apps/installed/payment");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Connect Wayl</h1>
        <p className="mt-2 text-sm text-gray-500">
          Enter your Wayl API key to start accepting payments from Iraqi customers via
          ZainCash, FastPay, and other local methods.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Find your API key in your{" "}
          <a
            href="https://dashboard.wayl.io/settings/api"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline"
          >
            Wayl merchant dashboard
          </a>
          .
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
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
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !apiKey}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Connecting…" : "Connect Wayl"}
        </button>
      </form>
    </div>
  );
}
