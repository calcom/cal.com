"use client";

import { useState } from "react";

import { TestForm } from "@calcom/app-store/routing-forms/components/SingleForm";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Label, Select } from "@calcom/ui";

import InsightsLayout from "./layout";

export default function InsightsVirtualQueuesPage() {
  const { t } = useLocale();
  const { data: routingForms, isLoading: isRoutingFormsLoading } =
    trpc.viewer.insights.getUserRelevantTeamRoutingForms.useQuery();

  const [selectedForm, setSelectedForm] = useState<RoutingForm>();

  return (
    <InsightsLayout>
      <Label>{t("routing_form")}</Label>
      <Select
        placeholder="Select project"
        options={routingForms?.map((form) => ({ label: form.name, value: form.id })) ?? []}
        isLoading={isRoutingFormsLoading}
        className="w-60"
        onChange={(e) => {
          setSelectedForm(e?.value);
        }}
        value={
          routingForms ? { label: routingForms[0].name, value: routingForms[0].id } : { label: "", id: 0 }
        }
      />
      {selectedForm ? <TestForm form={selectedForm} /> : <></>}
    </InsightsLayout>
  );

  return <></>;
}
