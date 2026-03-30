"use client";

import { useState } from "react";

import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import type { ActionFormProps } from "./ActionFormRegistry";

export function TransferOwnershipActionForm({ row, onComplete, onCancel }: ActionFormProps) {
  const teamId = row.id as number;
  const [newOwnerUserId, setNewOwnerUserId] = useState("");
  const [previousOwnerUserId, setPreviousOwnerUserId] = useState("");
  const [previousOwnerAction, setPreviousOwnerAction] = useState<"ADMIN" | "MEMBER" | "REMOVE">("ADMIN");
  const [customerId, setCustomerId] = useState("");

  const previewMutation = trpc.viewer.admin.transferOwnership.useMutation();
  const executeMutation = trpc.viewer.admin.transferOwnership.useMutation({
    onSuccess: () => {
      showToast("Ownership transferred successfully", "success");
      onComplete();
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const canPreview =
    newOwnerUserId.trim() &&
    previousOwnerUserId.trim() &&
    customerId.trim().startsWith("cus_");

  const handlePreview = () => {
    previewMutation.mutate({
      teamId,
      newOwnerUserId: parseInt(newOwnerUserId, 10),
      previousOwnerUserId: parseInt(previousOwnerUserId, 10),
      previousOwnerAction,
      customerId: customerId.trim(),
      mode: "preview",
    });
  };

  const handleExecute = () => {
    executeMutation.mutate({
      teamId,
      newOwnerUserId: parseInt(newOwnerUserId, 10),
      previousOwnerUserId: parseInt(previousOwnerUserId, 10),
      previousOwnerAction,
      customerId: customerId.trim(),
      mode: "execute",
    });
  };

  const previewData = previewMutation.data?.mode === "preview" ? previewMutation.data : null;

  return (
    <div className="space-y-3">
      <div className="text-xs text-subtle">
        Transfer ownership of Team #{teamId}{row.name ? ` (${row.name})` : ""}
      </div>

      <TextField
        label="Previous Owner User ID"
        name="previousOwnerUserId"
        type="number"
        placeholder="123"
        value={previousOwnerUserId}
        onChange={(e) => setPreviousOwnerUserId(e.target.value)}
      />

      <div>
        <label className="text-default mb-1 block text-sm font-medium">Previous Owner Action</label>
        <select
          className="border-subtle bg-default text-default h-9 w-full rounded-md border px-3 text-sm"
          value={previousOwnerAction}
          onChange={(e) => setPreviousOwnerAction(e.target.value as typeof previousOwnerAction)}>
          <option value="ADMIN">Demote to Admin</option>
          <option value="MEMBER">Demote to Member</option>
          <option value="REMOVE">Remove from team</option>
        </select>
      </div>

      <TextField
        label="New Owner User ID"
        name="newOwnerUserId"
        type="number"
        placeholder="456"
        value={newOwnerUserId}
        onChange={(e) => setNewOwnerUserId(e.target.value)}
      />

      <TextField
        label="Stripe Customer ID"
        name="customerId"
        placeholder="cus_..."
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
      />

      {previewMutation.error && (
        <p className="text-error text-xs">{previewMutation.error.message}</p>
      )}

      {previewData && (
        <div className="divide-subtle divide-y rounded-md border border-subtle text-xs">
          <div className="px-3 py-1.5">
            <span className="text-subtle font-medium">New Owner</span>
            <div className="mt-0.5">
              <span>{previewData.newOwner.name ?? previewData.newOwner.email}</span>
              <Badge variant="green" size="sm" className="ml-1">Owner</Badge>
            </div>
          </div>
          <div className="px-3 py-1.5">
            <span className="text-subtle font-medium">Previous Owner</span>
            <div className="mt-0.5">
              <span>{previewData.previousOwner.name ?? previewData.previousOwner.email}</span>
              <Badge variant="orange" size="sm" className="ml-1">{previewData.previousOwner.action}</Badge>
            </div>
          </div>
          <div className="px-3 py-1.5">
            <span className="text-subtle font-medium">Stripe Email Change</span>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-error font-mono text-[11px] line-through">
                {previewData.stripeEmailChange.from || "(empty)"}
              </span>
              <span className="text-muted">→</span>
              <span className="text-success font-mono text-[11px]">
                {previewData.stripeEmailChange.to}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {!previewData ? (
          <>
            <Button
              variant="default"
              size="sm"
              disabled={!canPreview}
              loading={previewMutation.isPending}
              onClick={handlePreview}>
              Preview
            </Button>
            <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          </>
        ) : (
          <>
            <Button
              variant="default"
              size="sm"
              loading={executeMutation.isPending}
              onClick={handleExecute}>
              Confirm Transfer
            </Button>
            <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          </>
        )}
      </div>
    </div>
  );
}
