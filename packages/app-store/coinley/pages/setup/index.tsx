import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";

export default function CoinleySetup() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect after 3 seconds
    const timer = setTimeout(() => {
      router.push("/apps/installed/payment");
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Coinley Setup Complete</h1>
          <p className="mt-2 text-sm text-gray-600">
            Your Coinley integration is ready to use!
          </p>
        </div>

        <Alert severity="success" title="Setup Complete">
          All Coinley settings are configured directly in your event type settings. No additional
          setup is required here.
        </Alert>

        <div className="space-y-4">
          <div className="rounded-md bg-blue-50 p-4">
            <h3 className="text-sm font-medium text-blue-900">Next Steps:</h3>
            <ul className="mt-2 space-y-2 text-sm text-blue-700">
              <li>✓ Configure wallet addresses at merchant.coinley.io</li>
              <li>✓ Add Coinley to your event types</li>
              <li>✓ Set your price in USD</li>
              <li>✓ Customers can pay with USDT or USDC</li>
            </ul>
          </div>

          <Button
            onClick={() => router.push("/apps/installed/payment")}
            className="w-full"
            color="primary">
            Go to Installed Apps
          </Button>
        </div>

        <p className="text-center text-xs text-gray-500">
          Redirecting automatically in 3 seconds...
        </p>
      </div>
    </div>
  );
}
