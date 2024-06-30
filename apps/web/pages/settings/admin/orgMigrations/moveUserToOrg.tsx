/**
 * It could be an admin feature to move a user to an organization but because it's a temporary thing before mono-user orgs are implemented, it's not right to spend time on it.
 * Plus, we need to do it only for cal.com and not provide as a feature to our self hosters.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import type { GetServerSidePropsContext } from "next";
import { getSession } from "next-auth/react";
import type { TFunction } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/client";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { getStringAsNumberRequiredSchema } from "@calcom/prisma/zod-utils";
import { Button, Form, Meta, SelectField, TextField, showToast } from "@calcom/ui";

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
    shouldMoveTeams: z.boolean(),
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

  const moveTeamsOptions = [
    {
      label: "Yes",
      value: "true",
    },
    {
      label: "No",
      value: "false",
    },
  ];
  const { t } = useLocale();
  const formSchema = getFormSchema(t);
  const form = useForm({
    mode: "onSubmit",
    resolver: zodResolver(formSchema),
  });

  const shouldMoveTeams = form.watch("shouldMoveTeams");
  const register = form.register;
  return (
    <Wrapper>
      {/*  Due to some reason auth from website doesn't work if /api endpoint is used. Spent a lot of time and in the end went with submitting data to the same page, because you can't do POST request to a page in Next.js, doing a GET request  */}
      <Form
        form={form}
        className="space-y-6"
        handleSubmit={async (values) => {
          setState(State.LOADING);
          const res = await fetch(`/api/orgMigration/moveUserToOrg`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(values),
          });
          let response = null;
          try {
            response = await res.json();
          } catch (e) {
            if (e instanceof Error) {
              showToast(e.message, "error", 10000);
            } else {
              showToast(t("something_went_wrong"), "error", 10000);
            }
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
            {...register("userName")}
            label="User Name"
            required
            defaultValue=""
            placeholder="Enter username to move to Org"
          />
          <Controller
            name="targetOrgRole"
            render={({ field: { value, onChange } }) => (
              <SelectField
                label="Role"
                options={roles}
                onChange={(option) => {
                  if (!option) return;
                  onChange(option.value);
                }}
                value={roles.find((role) => role.value === value)}
                required
                placeholder="Enter userId"
              />
            )}
          />
          <TextField
            label="Username in Target Org"
            type="text"
            required
            {...register("targetOrgUsername")}
            placeholder="Enter New username for the Org"
          />
          <TextField
            label="Target Organization ID"
            type="number"
            required
            {...register("targetOrgId")}
            placeholder="Enter Target organization ID"
          />
          <Controller
            name="shouldMoveTeams"
            render={({ field: { value, onChange } }) => (
              <SelectField
                label="Move Teams"
                className="mb-0"
                onChange={(option) => {
                  if (!option) return;
                  onChange(option.value === "true");
                }}
                value={moveTeamsOptions.find((opt) => opt.value === value)}
                required
                options={moveTeamsOptions}
              />
            )}
          />
        </div>

        <Button type="submit" loading={state === State.LOADING}>
          {shouldMoveTeams
            ? "Move User to Org along with its teams(except the teams' users)"
            : "Move User to Org"}
        </Button>
      </Form>
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
      ...(await serverSideTranslations(ctx.locale || "en", ["common"])),
    },
  };
}

MoveUserToOrg.PageWrapper = PageWrapper;
MoveUserToOrg.getLayout = getLayout;
