"use client";

import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";
import { Button } from "@coss/ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import { Label } from "@coss/ui/components/label";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@coss/ui/components/select";
import { useState } from "react";
import type { ActionFormProps } from "./ActionFormRegistry";

const BILLING_PERIOD_OPTIONS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "ANNUALLY", label: "Annually" },
];

const BILLING_MODE_OPTIONS = [
  { value: "SEATS", label: "Seats" },
  { value: "ACTIVE_USERS", label: "Active Users" },
];

export function EditOrgOnboardingForm({ row, onComplete, onCancel }: ActionFormProps) {
  const [name, setName] = useState((row.name as string) ?? "");
  const [slug, setSlug] = useState((row.slug as string) ?? "");
  const [orgOwnerEmail, setOrgOwnerEmail] = useState((row.orgOwnerEmail as string) ?? "");
  const [billingPeriod, setBillingPeriod] = useState((row.billingPeriod as string) ?? "MONTHLY");
  const [billingMode, setBillingMode] = useState((row.billingMode as string) ?? "SEATS");
  const [pricePerSeat, setPricePerSeat] = useState(String((row.pricePerSeat as number) ?? ""));
  const [seats, setSeats] = useState(String((row.seats as number) ?? ""));
  const [minSeats, setMinSeats] = useState(
    (row.minSeats as number | null) != null ? String(row.minSeats) : ""
  );
  const [isPlatform, setIsPlatform] = useState((row.isPlatform as boolean) ?? false);
  const [isComplete, setIsComplete] = useState((row.isComplete as boolean) ?? false);
  const [error, setError] = useState((row.error as string | null) ?? "");

  const mutation = trpc.viewer.admin.editOrgOnboarding.useMutation({
    onSuccess: () => {
      showToast("Organization onboarding record updated", "success");
      onComplete();
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const handleSubmit = () => {
    mutation.mutate({
      id: row.id as string,
      data: {
        name,
        slug,
        orgOwnerEmail,
        billingPeriod: billingPeriod as "MONTHLY" | "ANNUALLY",
        billingMode: billingMode as "SEATS" | "ACTIVE_USERS",
        pricePerSeat: pricePerSeat !== "" ? parseFloat(pricePerSeat) : undefined,
        seats: seats !== "" ? parseInt(seats, 10) : undefined,
        minSeats: minSeats !== "" ? parseInt(minSeats, 10) : null,
        isPlatform,
        isComplete,
        error: error !== "" ? error : null,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="text-subtle text-xs">
        Edit onboarding record <span className="font-mono">{row.id as string}</span>
      </div>

      <Field>
        <FieldLabel>Name</FieldLabel>
        <Input name="name" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>

      <Field>
        <FieldLabel>Slug</FieldLabel>
        <Input name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
      </Field>

      <Field>
        <FieldLabel>Owner Email</FieldLabel>
        <Input
          name="orgOwnerEmail"
          type="email"
          value={orgOwnerEmail}
          onChange={(e) => setOrgOwnerEmail(e.target.value)}
        />
      </Field>

      <div className="space-y-1.5">
        <Label>Billing Period</Label>
        <Select
          items={BILLING_PERIOD_OPTIONS}
          defaultValue={BILLING_PERIOD_OPTIONS.find((o) => o.value === billingPeriod)}
          onValueChange={(val) => {
            if (val) setBillingPeriod(val.value);
          }}>
          <SelectTrigger>
            <SelectValue placeholder="Select billing period" />
          </SelectTrigger>
          <SelectPopup>
            {BILLING_PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option}>
                {option.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Billing Mode</Label>
        <Select
          items={BILLING_MODE_OPTIONS}
          defaultValue={BILLING_MODE_OPTIONS.find((o) => o.value === billingMode)}
          onValueChange={(val) => {
            if (val) setBillingMode(val.value);
          }}>
          <SelectTrigger>
            <SelectValue placeholder="Select billing mode" />
          </SelectTrigger>
          <SelectPopup>
            {BILLING_MODE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option}>
                {option.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </div>

      <Field>
        <FieldLabel>Price Per Seat</FieldLabel>
        <Input
          name="pricePerSeat"
          type="number"
          value={pricePerSeat}
          onChange={(e) => setPricePerSeat(e.target.value)}
        />
      </Field>

      <Field>
        <FieldLabel>Seats</FieldLabel>
        <Input name="seats" type="number" value={seats} onChange={(e) => setSeats(e.target.value)} />
      </Field>

      <Field>
        <FieldLabel>Min Seats</FieldLabel>
        <Input
          name="minSeats"
          type="number"
          placeholder="Leave empty for no minimum"
          value={minSeats}
          onChange={(e) => setMinSeats(e.target.value)}
        />
        <FieldDescription>Minimum number of seats (leave empty for none)</FieldDescription>
      </Field>

      <Field>
        <FieldLabel>Error</FieldLabel>
        <Input
          name="error"
          placeholder="Leave empty to clear error"
          value={error}
          onChange={(e) => setError(e.target.value)}
        />
        <FieldDescription>Error message (leave empty to clear)</FieldDescription>
      </Field>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPlatform}
            onChange={(e) => setIsPlatform(e.target.checked)}
            className="accent-emphasis"
          />
          Is Platform
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isComplete}
            onChange={(e) => setIsComplete(e.target.checked)}
            className="accent-emphasis"
          />
          Is Complete
        </label>
      </div>

      {mutation.error && <p className="text-error text-xs">{mutation.error.message}</p>}

      <div className="flex gap-2">
        <Button variant="default" size="sm" loading={mutation.isPending} onClick={handleSubmit}>
          Save Changes
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
