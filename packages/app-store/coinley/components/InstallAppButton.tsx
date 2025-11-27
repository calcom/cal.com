"use client";

import { useState } from "react";
import { Button } from "@calcom/ui/components/button";
import { TextField, Label } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useRouter } from "next/navigation";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export default function InstallAppButton() {
  const router = useRouter();
  const { t } = useLocale();
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
        showToast(t("coinley_installed_successfully"), "success");
        if (data.redirectUrl) {
          router.push(data.redirectUrl);
        }
      } else {
        showToast(data.message || t("coinley_install_failed"), "error");
      }
    } catch (error) {
      console.error("Error installing Coinley:", error);
      showToast(t("coinley_install_failed"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t("coinley_connect_title")}</h2>
        <p className="text-sm text-gray-600 mt-2">
          {t("coinley_connect_description")}
        </p>
      </div>

      <form onSubmit={handleInstall} className="space-y-4">
        <div>
          <Label htmlFor="public_key">{t("coinley_public_key")}</Label>
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
            {t("coinley_get_public_key")}{" "}
            <a
              href="https://merchant.coinley.io/settings"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline">
              {t("coinley_settings")}
            </a>
            {" "}({t("coinley_starts_with_pk")})
          </p>
        </div>

        <div className="flex gap-2">
          <Button type="submit" loading={loading} className="flex-1">
            {loading ? t("connecting") : t("coinley_connect_button")}
          </Button>
        </div>
      </form>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h3 className="font-medium text-blue-900">{t("coinley_before_connecting")}</h3>
        <ul className="mt-2 space-y-1 text-sm text-blue-800">
          <li>✓ {t("coinley_configure_wallets")}{" "}
            <a
              href="https://merchant.coinley.io/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline">
              {t("coinley_dashboard")}
            </a>
          </li>
          <li>✓ {t("coinley_add_wallet_addresses")}</li>
          <li>✓ {t("coinley_generate_public_key")}</li>
        </ul>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mt-4">
        <h3 className="font-medium text-gray-900">{t("coinley_why_coinley")}</h3>
        <ul className="mt-2 space-y-1 text-sm text-gray-700">
          <li>✓ {t("coinley_benefit_direct_wallet")}</li>
          <li>✓ {t("coinley_benefit_no_intermediaries")}</li>
          <li>✓ {t("coinley_benefit_multi_chain")}</li>
          <li>✓ {t("coinley_benefit_lower_fees")}</li>
          <li>✓ {t("coinley_benefit_instant_settlement")}</li>
        </ul>
      </div>

      <div className="text-xs text-gray-500">
        {t("coinley_no_account")}{" "}
        <a href="https://merchant.coinley.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          {t("coinley_sign_up_free")}
        </a>
      </div>
    </div>
  );
}
