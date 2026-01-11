"use client";

import { useState } from "react";

import type { RoutingForm } from "@calcom/app-store/routing-forms/types/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Label } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";

import { TestForm } from "../../components/apps/routing-forms/TestForm";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

export default function InsightsVirtualQueuesPage() {
  const { t } = useLocale();
  const { data: routingForms, isLoading: isRoutingFormsLoading } =
    trpc.viewer.insights.getUserRelevantTeamRoutingForms.useQuery();

  const [selectedForm, setSelectedForm] = useState<RoutingForm | undefined>(
    routingForms && routingForms.length > 0 ? routingForms[0] : undefined
  );

  if (routingForms && !selectedForm && routingForms.length > 0) {
    setSelectedForm(routingForms[0]);
  }

  if (routingForms && routingForms.length === 0) {
    return (
      <EmptyScreen
        Icon="split"
        headline={t("no_routing_forms")}
        description={t("empty_routing_forms_description")}
      />
    )
  }

  return (
    <>
      <Label>{t("routing_form")}</Label>
      <Select
        placeholder="Select project"
        options={routingForms?.map((form) => ({ label: form.name, value: form.id })) ?? []}
        isLoading={isRoutingFormsLoading}
        className="w-60"
        onChange={(e) => {
          if (e && routingForms) {
            const form = routingForms.find((form) => form.id === e.value);
            setSelectedForm(form);
          }
        }}
        value={selectedForm ? { label: selectedForm.name, value: selectedForm.id } : undefined}
      />
      <div className="mt-10">
        {selectedForm ? (
          <TestForm form={selectedForm} supportsTeamMembersMatchingLogic={true} showRRData={true} />
        ) : (
          <></>
        )}
      </div>
    </>
  );

  return <></>;
}
