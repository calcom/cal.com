"use client";

import { useState } from "react";

import { trpc } from "@calcom/trpc/react";
import { Button } from "@coss/ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import { showToast } from "@calcom/ui/components/toast";

import type { ActionFormProps } from "./ActionFormRegistry";

export function ReleaseUsernameForm({ row, onComplete, onCancel }: ActionFormProps) {
  const profileUsername = row.username as string | undefined;
  const profileOrgId = row.organizationId as number | undefined;

  const [username, setUsername] = useState(profileUsername ?? "");
  const [orgId, setOrgId] = useState<string>(profileOrgId != null ? String(profileOrgId) : "");

  const previewMutation = trpc.viewer.admin.releaseUsername.useMutation();
  const executeMutation = trpc.viewer.admin.releaseUsername.useMutation({
    onSuccess: (data) => {
      if (data.mode === "execute" && data.released) {
        showToast(`Username "${username}" released`, "success");
        onComplete();
      } else {
        showToast("No blocking records found — nothing to release", "warning");
      }
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const previewData = previewMutation.data?.mode === "preview" ? previewMutation.data : null;
  const parsedOrgId = orgId !== "" ? parseInt(orgId, 10) : null;

  const handlePreview = () => {
    previewMutation.mutate({
      username,
      organizationId: parsedOrgId,
      mode: "preview",
    });
  };

  const handleExecute = () => {
    executeMutation.mutate({
      username,
      organizationId: parsedOrgId,
      mode: "execute",
    });
  };

  return (
    <div className="space-y-4">
      <div className="text-subtle text-xs">
        Release a username that is stuck in an organization or blocked by a redirect. This will remove
        Profile records, null out User.username, and delete TempOrgRedirect entries.
      </div>

      <Field>
        <FieldLabel>Username</FieldLabel>
        <Input
          name="username"
          type="text"
          placeholder="e.g. growth100"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            previewMutation.reset();
          }}
        />
      </Field>

      <Field>
        <FieldLabel>Organization ID</FieldLabel>
        <Input
          name="orgId"
          type="number"
          placeholder="Leave empty for global namespace"
          value={orgId}
          onChange={(e) => {
            setOrgId(e.target.value);
            previewMutation.reset();
          }}
        />
        <FieldDescription>
          The org the username is stuck in. Leave empty to check the global (non-org) namespace.
        </FieldDescription>
      </Field>

      {previewData && (
        <div className="bg-subtle rounded-md p-3 text-sm">
          {previewData.blockingRecords.length === 0 ? (
            <p className="text-subtle">
              No blocking records found for <strong>{previewData.username}</strong>. The username may already
              be available.
            </p>
          ) : (
            <>
              <p className="text-default mb-2 font-medium">
                Found {previewData.blockingRecords.length} blocking record(s):
              </p>
              <ul className="list-inside list-disc space-y-1">
                {previewData.blockingRecords.map((r, i) => (
                  <li key={i} className="text-subtle text-xs">
                    <span className="bg-emphasis rounded px-1 py-0.5 font-mono text-[11px]">{r.type}</span>{" "}
                    {r.detail}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {(previewMutation.error || executeMutation.error) && (
        <p className="text-error text-xs">
          {previewMutation.error?.message || executeMutation.error?.message}
        </p>
      )}

      <div className="flex gap-2">
        {!previewData || previewData.blockingRecords.length === 0 ? (
          <>
            <Button
              variant="default"
              size="sm"
              loading={previewMutation.isPending}
              disabled={!username.trim()}
              onClick={handlePreview}>
              Preview
            </Button>
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="destructive"
              size="sm"
              loading={executeMutation.isPending}
              onClick={handleExecute}>
              Release Username
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                previewMutation.reset();
              }}>
              Back
            </Button>
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
