"use client";

import UsersTable from "@pages/settings/admin/lockedSMS/UsersTable";

import { Meta } from "@calcom/ui";

type FormValues = {
  name: string;
  redirectUri: string;
  logo: string;
};

export default function LockedSMSView() {
  return (
    <div>
      <Meta title="lockedSMS" description="Lock or unlock SMS sending for users" />
      <UsersTable />
    </div>
  );
}
