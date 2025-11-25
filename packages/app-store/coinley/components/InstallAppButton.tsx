"use client";

import { useState } from "react";
import { Button } from "@calcom/ui/components/button";
import { TextField, Label } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useRouter } from "next/navigation";

export default function InstallAppButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [publicKey, setPublicKey] = useState("");

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/integrations/coinley/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ public_key: publicKey }),
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
          <Label htmlFor="public_key">Public Key</Label>
          <TextField
            id="public_key"
            type="text"
            placeholder="pk_your_public_key_here"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            required
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Get your public key from{" "}
            <a
              href="https://merchant.coinley.io/settings"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline">
              Coinley Settings
            </a>
            {" "}(starts with pk_)
          </p>
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
              href="https://merchant.coinley.io/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline">
              Coinley Dashboard
            </a>
          </li>
          <li>✓ Add wallet addresses for each network you want to support (Ethereum, BSC, Polygon, etc.)</li>
          <li>✓ Generate your public key from the API Keys section (it's safe to share)</li>
        </ul>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mt-4">
        <h3 className="font-medium text-gray-900">Why Coinley?</h3>
        <ul className="mt-2 space-y-1 text-sm text-gray-700">
          <li>✓ Accept crypto payments directly to your wallet</li>
          <li>✓ No intermediaries - you control your funds</li>
          <li>✓ Support for USDT and USDC on 8 EVM blockchains</li>
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
