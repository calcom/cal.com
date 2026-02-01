import { useRouter } from "next/router";
import { useState } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { Button, showToast } from "@calcom/ui";

export default function LawPaySetup() {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);

    try {
      // Get current user ID from session
      const userResponse = await fetch("/api/auth/session");
      const session = await userResponse.json();

      if (!session?.user?.id) {
        showToast("Please log in to connect LawPay", "error");
        setIsConnecting(false);
        return;
      }

      // Create state parameter with user info
      const state = Buffer.from(
        JSON.stringify({
          userId: session.user.id,
          returnTo: router.query.returnTo || `${WEBAPP_URL}/apps/installed/payment`,
        })
      ).toString("base64");

      // Redirect to LawPay OAuth
      const authUrl = new URL(
        `${process.env.NEXT_PUBLIC_LAWPAY_API_URL || "https://api.lawpay.com"}/oauth/authorize`
      );
      authUrl.searchParams.append("client_id", process.env.NEXT_PUBLIC_LAWPAY_CLIENT_ID || "");
      authUrl.searchParams.append("response_type", "code");
      authUrl.searchParams.append("redirect_uri", `${WEBAPP_URL}/api/integrations/lawpay/callback`);
      authUrl.searchParams.append("state", state);
      authUrl.searchParams.append("scope", "payments:read payments:write");

      window.location.href = authUrl.toString();
    } catch (error) {
      console.error("LawPay connection error:", error);
      showToast("Failed to connect to LawPay", "error");
      setIsConnecting(false);
    }
  };

  return (
    <div className="bg-default flex h-screen">
      <div className="m-auto rounded-md bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Connect LawPay</h1>
          <p className="text-subtle mt-2">
            Accept payments from your clients with IOLTA trust accounting compliance
          </p>
        </div>

        <div className="mb-6 space-y-4">
          <div className="rounded-md bg-blue-50 p-4">
            <h3 className="font-semibold text-blue-900">What you'll get:</h3>
            <ul className="text-subtle mt-2 list-inside list-disc space-y-1 text-sm">
              <li>IOLTA-compliant trust accounting</li>
              <li>Separate operating and trust accounts</li>
              <li>Secure credit card and eCheck processing</li>
              <li>Real-time payment confirmation</li>
              <li>Attorney-specific compliance features</li>
            </ul>
          </div>

          <div className="rounded-md bg-yellow-50 p-4">
            <h3 className="font-semibold text-yellow-900">Before you start:</h3>
            <ul className="text-subtle mt-2 list-inside list-disc space-y-1 text-sm">
              <li>You need an active LawPay account</li>
              <li>Your account must be verified and approved</li>
              <li>You'll be redirected to LawPay to authorize access</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-4">
          <Button
            color="secondary"
            onClick={() => router.back()}
            disabled={isConnecting}
            className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleConnect} loading={isConnecting} className="flex-1">
            Connect LawPay
          </Button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-subtle text-xs">
            Don't have a LawPay account?{" "}
            <a
              href="https://lawpay.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline">
              Sign up here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
