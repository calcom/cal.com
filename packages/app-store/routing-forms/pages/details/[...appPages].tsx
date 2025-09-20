"use client";

import { Checkbox } from "@calid/features/ui/components/input/checkbox-field";
import { Input } from "@calid/features/ui/components/input/input";
import { TextArea } from "@calid/features/ui/components/input/text-area";
import Link from "next/link";
import { Controller } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { Toaster } from "sonner";
import { Switch } from "@calcom/ui/components/form";

import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { IS_CALCOM } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Badge } from "@calcom/ui/components/badge";
import { FormCard } from "@calcom/ui/components/card";
import { Tooltip } from "@calcom/ui/components/tooltip";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import SingleForm from "../../components/SingleForm";
import { PreviewRenderer, type UptoDateForm } from "../../components/_components/TestForm";
import { TeamMemberSelect } from "../../components/_components/TeamMemberSelect";
import type { getServerSidePropsForSingleFormViewCalId as getServerSideProps } from "../../components/getServerSidePropsSingleFormCalId";
import type { RoutingFormWithResponseCount, SerializableForm } from "../../types/types";

type HookForm = UseFormReturn<RoutingFormWithResponseCount>;

const FormSettings = ({
  hookForm,
  uptoDateForm,
  form,
  appUrl,
}: {
  hookForm: HookForm;
  form: inferSSRProps<typeof getServerSideProps>["form"];
  uptoDateForm: UptoDateForm;
  appUrl: string;
}) => {
  const orgBranding = useOrgBranding();

  const { t } = useLocale();
  const { data: user } = useMeQuery();
  const sendUpdatesTo = hookForm.watch("settings.sendUpdatesTo") || [];
  const sendToAll = hookForm.watch("settings.sendToAll") || false;

  const formLink = `${orgBranding?.fullDomain ?? WEBSITE_URL}/forms/${form.id}`;

  return (
    <div className="flex w-full py-4">
      <div className="flex w-full gap-6">
        <div className="flex grid w-full grid-cols-1 justify-between gap-10 sm:grid-cols-2 md:grid-cols-2">
          <div className="bg-default border-subtle gap-3 rounded-md border p-6">
            <div className="mb-3">
              <span className="text-default text-sm font-semibold">{t("form_name_lable")}</span>
              <Input
                type="text"
                label={t("name")}
                placeholder={t("title")}
                {...hookForm.register("name")}
                data-testid="name"
                required
              />
            </div>
            <div className="mb-3">
              <span className="text-default text-sm font-semibold">{t("form_description_lable")}</span>
              <TextArea
                rows={3}
                id="description"
                data-testid="description"
                placeholder={t("form_description_placeholder")}
                className="border-default rounded-md border text-sm"
                {...hookForm.register("description")}
                defaultValue={form.description || ""}
              />
            </div>
            <div className="mb-3">
              <span className="text-default text-sm font-semibold">{t("form_link_lable")}</span>
              <div className="flex flex-row gap-2">
                <Input
                  type="text"
                  label={t("form_link")}
                  value={formLink}
                  readOnly
                  data-testid="name"
                  required
                />
                <Tooltip content={t("copy_link_to_form")}>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(formLink);
                    }}
                    type="button"
                    color="minimal"
                    StartIcon="clipboard"
                    className="h-8"
                  />
                </Tooltip>
                <Tooltip content={t("preview")}>
                  <Link href={formLink} target="_blank">
                    <Button type="button" color="minimal" StartIcon="external-link" className="h-8" />
                  </Link>
                </Tooltip>
              </div>
            </div>

            <Controller
              name="settings.emailOwnerOnSubmission"
              control={hookForm.control}
              render={({ field: { value, onChange } }) => {
                return (
                  <>
                    {form.calIdTeamId && (
                      <>
                        <div className="mt-4">
                          <div className="space-y-4">
                            <TeamMemberSelect
                              teamMembers={form.teamMembers || []}
                              selectedMembers={sendUpdatesTo}
                              onChange={(memberIds) => {
                                hookForm.setValue("settings.sendUpdatesTo", memberIds, { shouldDirty: true });
                                hookForm.setValue("settings.emailOwnerOnSubmission", false, {
                                  shouldDirty: true,
                                });
                              }}
                              onSelectAll={(selectAll) => {
                                hookForm.setValue("settings.sendToAll", selectAll, { shouldDirty: true });
                              }}
                              selectAllEnabled={true}
                              sendToAll={sendToAll}
                              placeholder={t("select_members")}
                            />
                          </div>
                        </div>
                      </>
                    )}
                    {!form.calIdTeamId && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={value}
                          onCheckedChange={(val) => {
                            onChange(val);
                            hookForm.unregister("settings.sendUpdatesTo");
                          }}
                          id="emailOwnerOnSubmission"
                        />
                        <label
                          htmlFor="emailOwnerOnSubmission"
                          className="text-default text-sm font-medium leading-none">
                          {t("routing_forms_send_email_owner")}
                        </label>
                      </div>
                    )}
                  </>
                );
              }}
            />

              
          </div>

          <div className="bg-default border-subtle w-full gap-3 rounded-md border p-6">
            <PreviewRenderer testForm={uptoDateForm} />
          </div>
        </div>

        {/* Routers Card */}
        {form.routers.length ? (
          <FormCard label={t("routers")}>
            <div className="bg-default border-default w-full gap-3 rounded-2xl border p-6">
              <p className="text-default mb-4 text-sm leading-normal">
                {t("modifications_in_fields_warning")}
              </p>
              <div className="flex flex-wrap gap-2">
                {form.routers.map((router) => {
                  return (
                    <Link key={router.id} href={`${appUrl}/route-builder/${router.id}`}>
                      <Badge variant="gray">{router.name}</Badge>
                    </Link>
                  );
                })}
              </div>
            </div>
          </FormCard>
        ) : null}

        {/* Connected Forms Card */}
        {form.connectedForms?.length ? (
          <FormCard label={t("connected_forms")}>
            <div className="bg-default border-default w-full gap-3 rounded-2xl border p-6">
              <p className="text-default mb-4 text-sm leading-normal">{t("form_modifications_warning")}</p>
              <div className="flex flex-wrap gap-2">
                {form.connectedForms.map((router) => {
                  return (
                    <Link key={router.id} href={`${appUrl}/route-builder/${router.id}`}>
                      <Badge variant="default">{router.name}</Badge>
                    </Link>
                  );
                })}
              </div>
            </div>
          </FormCard>
        ) : null}
      </div>
    </div>
  );
};

export default function Details({
  appUrl,
  ...props
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  // Convert the form type to match SingleFormComponentProps expectations
  const adaptedForm: RoutingFormWithResponseCount = {
    ...props.form,
    team: props.form.calIdTeam ? {
      slug: props.form.calIdTeam.slug,
      name: props.form.calIdTeam.name,
    } : null,
  };

  return (
    <>
      <Toaster position="bottom-right" />
      <SingleForm
        {...props}
        form={adaptedForm}
        appUrl={appUrl}
        Page={({ hookForm, form, uptoDateForm }) => (
          <FormSettings appUrl={appUrl} hookForm={hookForm} form={props.form} uptoDateForm={uptoDateForm} />
        )}
      />
    </>
  );
}
