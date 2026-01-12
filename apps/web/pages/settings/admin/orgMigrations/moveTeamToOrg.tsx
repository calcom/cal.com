"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { TFunction } from "next-i18next";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getStringAsNumberRequiredSchema } from "@calcom/prisma/zod-utils";
import { Button, Form, Meta, TextField, showToast } from "@calcom/ui";

import { getServerSideProps } from "@lib/settings/admin/orgMigrations/moveTeamToOrg/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

import { getLayout } from "./_OrgMigrationLayout";

export { getServerSideProps };

export const getFormSchema = (t: TFunction) => {
  return z.object({
    teamId: z.number().or(getStringAsNumberRequiredSchema(t)),
    targetOrgId: z.number().or(getStringAsNumberRequiredSchema(t)),
    teamSlugInOrganization: z.string(),
  });
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Meta title="Organization Migration: Move a team" description="Migrates a team to an organization" />
      {children}
    </div>
  );
}

const enum State {
  IDLE,
  LOADING,
  SUCCESS,
  ERROR,
}

export default function MoveTeamToOrg() {
  const [state, setState] = useState(State.IDLE);
  const { t } = useLocale();
  const formSchema = getFormSchema(t);
  const formMethods = useForm({
    mode: "onSubmit",
    resolver: zodResolver(formSchema),
  });

  const { register } = formMethods;
  return (
    <Wrapper>
      <Form
        className="space-y-6"
        noValidate={true}
        form={formMethods}
        handleSubmit={async (values) => {
          setState(State.LOADING);
          const res = await fetch(`/api/orgMigration/moveTeamToOrg`, {
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
            {...register("teamId")}
            label="Team ID"
            required
            placeholder="Enter teamId to move to org"
          />
          <TextField
            {...register("teamSlugInOrganization")}
            label="New Slug"
            required
            placeholder="Team slug in the Organization"
          />
          <TextField
            {...register("targetOrgId")}
            label="Target Organization ID"
            required
            placeholder="Enter Target organization ID"
          />
          <div className="mt-2 text-sm text-gray-600">
            Note: Team members will automatically be invited to the organization when the team is moved.
          </div>
        </div>
        <Button type="submit" loading={state === State.LOADING}>
          Move Team to Org
        </Button>
      </Form>
    </Wrapper>
  );
}

MoveTeamToOrg.PageWrapper = PageWrapper;
MoveTeamToOrg.getLayout = getLayout;
