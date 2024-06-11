"use client";

import UsersTable from "@pages/settings/admin/lockedSMS/UsersTable";
import { useState } from "react";

import { trpc } from "@calcom/trpc";
import { Button, Meta, TextField, showToast } from "@calcom/ui";

export default function LockedSMSView() {
  const [username, setUsername] = useState("");
  const [teamSlug, setTeamSlug] = useState("");

  const utils = trpc.useContext();

  const mutation = trpc.viewer.admin.setSMSLockState.useMutation({
    onSuccess: (data) => {
      if (data) {
        showToast(`${data.name} successfully ${data.locked ? "locked" : "unlocked"}`, "success");
      }
      utils.viewer.admin.getSMSLockStateTeamsUsers.invalidate();
    },
    onError: (error) => {
      showToast(`${error}`, "error");
      utils.viewer.admin.getSMSLockStateTeamsUsers.invalidate();
    },
  });

  function setSMSLockState({ userId, teamId, lock }: { userId?: number; teamId?: number; lock: boolean }) {
    mutation.mutate({
      userId,
      teamId,
      lock,
    });
  }

  return (
    <div>
      <Meta title="lockedSMS" description="Lock or unlock SMS sending for users" />
      <div className="mb-4 flex w-full items-center justify-between space-x-2 rtl:space-x-reverse">
        <div className="flex">
          <TextField
            name="Lock User"
            placeholder="username"
            defaultValue=""
            onChange={(event) => setUsername(event.target.value)}
            value={username}
          />
          <Button
            type="submit"
            className="ml-2 mt-5"
            onClick={() => {
              mutation.mutate({ username, lock: true });
              utils.viewer.admin.getSMSLockStateTeamsUsers.invalidate();
            }}>
            Lock User
          </Button>
        </div>
        <div className="flex">
          <TextField
            name="Lock Team"
            placeholder="team slug"
            defaultValue=""
            onChange={(event) => {
              setTeamSlug(event.target.value);
            }}
            value={teamSlug}
          />
          <Button
            type="submit"
            className="ml-2 mt-5"
            onClick={() => {
              mutation.mutate({ teamSlug, lock: true });
              utils.viewer.admin.getSMSLockStateTeamsUsers.invalidate();
            }}>
            Lock Team
          </Button>
        </div>
      </div>
      <UsersTable setSMSLockState={setSMSLockState} />
    </div>
  );
}
