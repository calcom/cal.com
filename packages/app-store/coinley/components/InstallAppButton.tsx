"use client";

import { useState } from "react";
import { Button } from "@calcom/ui/components/button";
import { TextField, Label } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useRouter } from "next/navigation";

export default function InstallAppButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState({
    api_key: "",
    api_secret: "",
  });

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/integrations/coinley/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success) {
        showToast("Coinley installed successfully!", "success");
        if (data.redirectUrl) {
          router.push(data.redirectUrl);
        }
      } else {
        showToast(data.message || "Failed to install Coinley", "error");
      }
    } catch (error: any) {
      console.error("Error installing Coinley:", error);
      showToast(error.message || "Failed to install Coinley", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Connect Coinley</h2>
        <p className="text-sm text-gray-600 mt-2">
          Accept cryptocurrency payments directly to your wallet with Coinley. Support for USDT, USDC, and
          more across Ethereum, BSC, Polygon, and other major blockchains.
        </p>
      </div>

      <form onSubmit={handleInstall} className="space-y-4">
        <div>
          <Label htmlFor="api_key">API Key</Label>
          <TextField
            id="api_key"
            type="text"
            placeholder="Your Coinley API Key"
            value={credentials.api_key}
            onChange={(e) => setCredentials({ ...credentials, api_key: e.target.value })}
            required
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Get your API key from{" "}
            <a
              href="https://hub.coinley.io/dashboard/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline">
              Coinley Dashboard
            </a>
          </p>
        </div>

        <div>
          <Label htmlFor="api_secret">API Secret</Label>
          <TextField
            id="api_secret"
            type="password"
            placeholder="Your Coinley API Secret"
            value={credentials.api_secret}
            onChange={(e) => setCredentials({ ...credentials, api_secret: e.target.value })}
            required
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">Keep this secret secure. Never share it publicly.</p>
        </div>

        <div className="flex gap-2">
          <Button type="submit" loading={loading} className="flex-1">
            {loading ? "Connecting..." : "Connect Coinley"}
          </Button>
        </div>
      </form>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h3 className="font-medium text-blue-900">Before connecting:</h3>
        <ul className="mt-2 space-y-1 text-sm text-blue-800">
          <li>✓ Configure your wallet addresses in the{" "}
            <a
              href="https://hub.coinley.io/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline">
              Coinley Dashboard
            </a>
          </li>
          <li>✓ Add wallet addresses for each network you want to support (Ethereum, BSC, Polygon, etc.)</li>
          <li>✓ Generate your API key and secret from the API Keys section</li>
        </ul>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mt-4">
        <h3 className="font-medium text-gray-900">Why Coinley?</h3>
        <ul className="mt-2 space-y-1 text-sm text-gray-700">
          <li>✓ Accept crypto payments directly to your wallet</li>
          <li>✓ No intermediaries - you control your funds</li>
          <li>✓ Support for 8+ blockchains and 50+ tokens</li>
          <li>✓ Lower fees than traditional payment processors</li>
          <li>✓ Instant settlement - no waiting for payouts</li>
        </ul>
      </div>

      <div className="text-xs text-gray-500">
        Don't have a Coinley account?{" "}
        <a href="https://merchant.coinley.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          Sign up for free
        </a>
      </div>
    </div>
  );
}
