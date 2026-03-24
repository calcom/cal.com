"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { PanelCard } from "@calcom/ui/components/card";
import { Label, TextField, ToggleGroup } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";
import LicenseView from "./license-view";

type BillingMode = "SEATS" | "ACTIVE_USERS";

export default function AdminBillingView() {
  return (
    <div className="flex flex-col gap-6">
      <TeamBillingManagement />
      <LicenseView />
    </div>
  );
}

function TeamBillingManagement() {
  const { t } = useLocale();
  const [teamIdInput, setTeamIdInput] = useState("");
  const [searchedTeamId, setSearchedTeamId] = useState<number | null>(null);

  const billingQuery = trpc.viewer.admin.getBillingForTeam.useQuery(
    { teamId: searchedTeamId! },
    { enabled: searchedTeamId !== null }
  );

  const handleLookup = () => {
    const parsed = parseInt(teamIdInput, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setSearchedTeamId(parsed);
    }
  };

  return (
    <PanelCard
      title={t("admin_billing_team_management_title")}
      subtitle={t("admin_billing_team_management_subtitle")}>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <TextField
            containerClassName="w-full"
            label={t("admin_billing_team_id_label")}
            name="teamId"
            type="number"
            placeholder={t("admin_billing_team_id_placeholder")}
            value={teamIdInput}
            onChange={(e) => setTeamIdInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLookup();
            }}
          />
          <Button
            type="button"
            loading={billingQuery.isLoading && searchedTeamId !== null}
            disabled={!teamIdInput.trim()}
            onClick={handleLookup}>
            {t("admin_billing_lookup_button")}
          </Button>
        </div>

        {billingQuery.data && !billingQuery.data.found && (
          <p className="text-subtle text-sm">{t("admin_billing_team_not_found")}</p>
        )}

        {billingQuery.data?.found && (
          <BillingEditor
            teamId={billingQuery.data.team.id}
            teamName={billingQuery.data.team.name}
            teamSlug={billingQuery.data.team.slug}
            isOrganization={billingQuery.data.team.isOrganization}
            billing={billingQuery.data.billing}
            onUpdated={() => billingQuery.refetch()}
          />
        )}
      </div>
    </PanelCard>
  );
}

type BillingData = {
  id: string;
  billingMode: BillingMode;
  billingPeriod: string | null;
  pricePerSeat: number | null;
  paidSeats: number | null;
  subscriptionId: string;
  subscriptionItemId: string;
  customerId: string;
  status: string;
  planName: string;
  subscriptionStart: Date | null;
  subscriptionEnd: Date | null;
  subscriptionTrialEnd: Date | null;
};

function BillingEditor({
  teamId,
  teamName,
  teamSlug,
  isOrganization,
  billing,
  onUpdated,
}: {
  teamId: number;
  teamName: string;
  teamSlug: string | null;
  isOrganization: boolean;
  billing: BillingData | null;
  onUpdated: () => void;
}) {
  const { t } = useLocale();

  const [billingMode, setBillingMode] = useState<BillingMode>(billing?.billingMode ?? "SEATS");
  const [pricePerSeat, setPricePerSeat] = useState<string>(
    billing?.pricePerSeat != null ? String(billing.pricePerSeat) : ""
  );
  const [paidSeats, setPaidSeats] = useState<string>(
    billing?.paidSeats != null ? String(billing.paidSeats) : ""
  );

  const updateMutation = trpc.viewer.admin.updateBillingForTeam.useMutation({
    onSuccess: () => {
      showToast(t("admin_billing_update_success"), "success");
      onUpdated();
    },
    onError: (error) => {
      showToast(error.message || t("admin_billing_update_error"), "error");
    },
  });

  const handleSave = () => {
    const parsedPrice = pricePerSeat ? parseInt(pricePerSeat, 10) : undefined;
    const parsedSeats = paidSeats ? parseInt(paidSeats, 10) : undefined;

    updateMutation.mutate({
      teamId,
      billingMode,
      ...(parsedPrice !== undefined && !isNaN(parsedPrice) ? { pricePerSeat: parsedPrice } : {}),
      ...(parsedSeats !== undefined && !isNaN(parsedSeats) ? { paidSeats: parsedSeats } : {}),
    });
  };

  return (
    <div className="border-subtle flex flex-col gap-4 rounded-lg border p-4">
      <div>
        <h3 className="text-emphasis text-base font-semibold">
          {teamName} {teamSlug ? `(${teamSlug})` : ""}
        </h3>
        <p className="text-subtle text-sm">
          {isOrganization ? t("admin_billing_type_organization") : t("admin_billing_type_team")} · ID:{" "}
          {teamId}
        </p>
      </div>

      {billing ? (
        <>
          <div className="bg-subtle rounded-md p-3">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-subtle">{t("admin_billing_status")}</dt>
              <dd className="text-emphasis font-medium">{billing.status}</dd>
              <dt className="text-subtle">{t("admin_billing_plan")}</dt>
              <dd className="text-emphasis font-medium">{billing.planName}</dd>
              <dt className="text-subtle">{t("admin_billing_period")}</dt>
              <dd className="text-emphasis font-medium">{billing.billingPeriod ?? "—"}</dd>
              <dt className="text-subtle">{t("admin_billing_customer_id")}</dt>
              <dd className="text-emphasis font-mono text-xs">{billing.customerId}</dd>
              <dt className="text-subtle">{t("admin_billing_subscription_id")}</dt>
              <dd className="text-emphasis font-mono text-xs">{billing.subscriptionId}</dd>
            </dl>
          </div>

          <div>
            <Label>{t("admin_billing_mode_label")}</Label>
            <ToggleGroup
              isFullWidth
              value={billingMode}
              onValueChange={(val: BillingMode) => {
                if (val === "SEATS" || val === "ACTIVE_USERS") {
                  setBillingMode(val);
                }
              }}
              options={[
                { value: "SEATS", label: t("admin_billing_mode_seats") },
                { value: "ACTIVE_USERS", label: t("admin_billing_mode_active_users") },
              ]}
            />
          </div>

          <section className="grid grid-cols-2 gap-4">
            <TextField
              containerClassName="w-full"
              label={t("admin_billing_price_per_seat_label")}
              name="pricePerSeat"
              type="number"
              addOnSuffix="$"
              placeholder="30"
              min={0}
              value={pricePerSeat}
              onChange={(e) => setPricePerSeat(e.target.value)}
            />
            <TextField
              containerClassName="w-full"
              label={t("admin_billing_paid_seats_label")}
              name="paidSeats"
              type="number"
              placeholder="1"
              min={0}
              value={paidSeats}
              onChange={(e) => setPaidSeats(e.target.value)}
            />
          </section>

          <Button type="button" loading={updateMutation.isPending} onClick={handleSave}>
            {t("admin_billing_save_button")}
          </Button>
        </>
      ) : (
        <p className="text-subtle text-sm">{t("admin_billing_no_billing_record")}</p>
      )}
    </div>
  );
}
