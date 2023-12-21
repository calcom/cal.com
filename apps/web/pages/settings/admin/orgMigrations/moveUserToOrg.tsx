/**
 * It could be an admin feature to move a user to an organization but because it's a temporary thing before mono-user orgs are implemented, it's not right to spend time on it.
 * Plus, we need to do it only for cal.com and not provide as a feature to our self hosters.
 */
import type { GetServerSidePropsContext } from "next";
import { getSession } from "next-auth/react";
import type { TFunction } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useState } from "react";
import z from "zod";

import { MembershipRole } from "@calcom/prisma/client";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { getStringAsNumberRequiredSchema } from "@calcom/prisma/zod-utils";
import { Button, Meta, SelectField, TextField, showToast } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

import { getLayout } from "./_OrgMigrationLayout";

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Meta
        title="Organization Migration: Move a user"
        description="Migrates a user to an organization along with the user's teams. But the teams' users are not migrated"
      />
      {children}
    </div>
  );
}

export const getFormSchema = (t: TFunction) =>
  z.object({
    userId: z.union([z.string().pipe(z.coerce.number()), z.number()]).optional(),
    userName: z.string().optional(),
    targetOrgId: z.union([getStringAsNumberRequiredSchema(t), z.number()]),
    targetOrgUsername: z.string().min(1, t("error_required_field")),
    shouldMoveTeams: z
      .string()
      .transform((v) => v === "true")
      .pipe(z.boolean()),
    targetOrgRole: z.union([
      z.literal(MembershipRole.ADMIN),
      z.literal(MembershipRole.MEMBER),
      z.literal(MembershipRole.OWNER),
    ]),
  });

const enum State {
  IDLE,
  LOADING,
  SUCCESS,
  ERROR,
}
export default function MoveUserToOrg() {
  const [state, setState] = useState(State.IDLE);

  const roles = Object.values(MembershipRole).map((role) => ({
    label: role,
    value: role,
  }));

  const [shouldMoveTeams, setShouldMoveTeams] = useState(false);
  const moveTeamsOptions = [
    {
      label: "Yes",
      value: true,
    },
    {
      label: "No",
      value: false,
    },
  ];
  return (
    <Wrapper>
      {/*  Due to some reason auth from website doesn't work if /api endpoint is used. Spent a lot of time and in the end went with submitting data to the same page, because you can't do POST request to a page in Next.js, doing a GET request  */}
      <form
        className="space-y-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const data = Object.fromEntries(formData.entries());
          setState(State.LOADING);
          const res = await fetch(`/api/orgMigration/moveUserToOrg`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          });
          let response = null;
          try {
            response = await res.json();
          } catch (e) {
            showToast(e.message, "error", 10000);
            setState(State.ERROR);
            return;
          }
          if (res.status === 200) {
            setState(State.SUCCESS);
            showToast(response.message, "success", 10000);
          } else {
            setState(State.ERROR);
            showToast(response.message, "error", 10000);
          }
        }}>
        <div className="space-y-6">
          <TextField
            type="text"
            label="User Name"
            name="userName"
            required
            defaultValue=""
            placeholder="Enter username to move to Org"
          />
          <SelectField
            label="Role"
            options={roles}
            name="targetOrgRole"
            defaultValue={roles.find((role) => role.value === MembershipRole.MEMBER)}
            required
            placeholder="Enter userId"
          />
          <TextField
            label="Username in Target Org"
            type="text"
            required
            name="targetOrgUsername"
            placeholder="Enter New username for the Org"
          />
          <TextField
            label="Target Organization ID"
            type="number"
            required
            name="targetOrgId"
            placeholder="Enter Target organization ID"
          />
          <SelectField
            label="Move Teams"
            className="mb-0"
            name="shouldMoveTeams"
            onChange={(e) => {
              if (!e) return;
              setShouldMoveTeams(e.value === true);
            }}
            required
            options={moveTeamsOptions}
          />
        </div>

        <Button type="submit" loading={state === State.LOADING}>
          {shouldMoveTeams
            ? "Move User to Org along with it's teams(except the teams' users"
            : "Move User to Org"}
        </Button>
      </form>
    </Wrapper>
  );
}

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const session = await getSession(ctx);
  if (!session || !session.user) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const isAdmin = session.user.role === UserPermissionRole.ADMIN;
  if (!isAdmin) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }
  return {
    props: {
      ...(await serverSideTranslations(ctx.locale || "en", ["website"])),
    },
  };
}

MoveUserToOrg.PageWrapper = PageWrapper;
MoveUserToOrg.getLayout = getLayout;
