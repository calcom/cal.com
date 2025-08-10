"use client";

import { Checkbox, Input, Textarea, Button } from "@calid/features/ui";
import Link from "next/link";
import { Controller } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { TeamsSelectionDialog } from "routing-forms/components/TeamsSelectionDialog";
import { Toaster } from "sonner";

import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { IS_CALCOM } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { Badge } from "@calcom/ui/components/badge";
// import { Button } from "@calcom/ui/components/button";
import { FormCard } from "@calcom/ui/components/card";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import { FormAction } from "../../components/FormActions";
import SingleForm from "../../components/SingleForm";
import { PreviewRenderer, type UptoDateForm } from "../../components/_components/TestForm";
import type { getServerSidePropsForSingleFormView as getServerSideProps } from "../../components/getServerSidePropsSingleForm";
import type { RoutingFormWithResponseCount } from "../../types/types";

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
    <div className="w-full py-4 lg:py-8">
      <div className="flex w-full flex-col gap-6">
        {/* Basic Information Card */}
        {/* <FormCard label={t("basic_information")}> */}

        <div class="flex w-full flex-row justify-between gap-10">
          <div className="flex-1 bg-default border-default w-full gap-3 rounded-2xl border p-6">
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
              <Textarea
                rows={3}
                id="description"
                data-testid="description"
                label={t("description")}
                placeholder={t("form_description_placeholder")}
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
                      showToast(t("link_copied"), "success");
                      navigator.clipboard.writeText(formLink);
                    }}
                    type="button"
                    variant="outline"
                    size="sm">
                    <Icon name="clipboard" className="h-3 w-3" />
                  </Button>
                </Tooltip>
                <Tooltip content={t("preview")}>
                  <Link href={formLink} target="_blank">
                    <Button type="button" variant="outline" size="sm">
                      <Icon name="external-link" className="h-3 w-3" />
                    </Button>
                  </Link>
                </Tooltip>
              </div>
            </div>

            <Controller
              name="settings.emailOwnerOnSubmission"
              control={hookForm.control}
              render={({ field: { value, onChange } }) => {
                return (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={value}
                      onCheckedChange={(val) => {
                        onChange(val);
                        hookForm.unregister("settings.sendUpdatesTo");
                      }}
                      size="sm"
                      id="emailOwnerOnSubmission"
                    />
                    <label
                      htmlFor="emailOwnerOnSubmission"
                      className="text-default text-sm font-medium leading-none">
                      {t("routing_forms_send_email_owner")}
                    </label>
                  </div>
                );
              }}
            />
          </div>

          <div className="flex-1 bg-default border-default w-full gap-3 rounded-2xl border p-6">
            <PreviewRenderer testForm={uptoDateForm} />
          </div>
        </div>

        {/* </FormCard> */}

        {/* Notification Settings Card */}
        {/* <FormCard label={t("notification_settings")}>
          <div className="bg-default border-default w-full gap-3 rounded-2xl border p-6"> */}
        {/* {form.teamId ? (
              <div className="flex flex-col">
                <TeamMemberSelect
                  teamMembers={form.teamMembers}
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
            ) : (
              <Controller
                name="settings.emailOwnerOnSubmission"
                control={hookForm.control}
                render={({ field: { value, onChange } }) => {
                  return (
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="emailOwnerOnSubmission"
                        className="text-default text-sm font-medium leading-none">
                        {t("routing_forms_send_email_owner")}
                      </label>
                      <Switch
                        size="sm"
                        id="emailOwnerOnSubmission"
                        checked={value}
                        onCheckedChange={(val) => {
                          onChange(val);
                          hookForm.unregister("settings.sendUpdatesTo");
                        }}
                      />
                    </div>
                  );
                }}
              />
            )} */}
        {/* </div>
        </FormCard> */}

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

        {/* Support Card */}
        {IS_CALCOM && (
          <FormCard label={t("support")}>
            <div className="bg-default border-default w-full gap-3 rounded-2xl border p-6">
              <Button
                target="_blank"
                color="minimal"
                href={`https://i.cal.com/support/routing-support-session?email=${encodeURIComponent(
                  user?.email ?? ""
                )}&name=${encodeURIComponent(user?.name ?? "")}&form=${encodeURIComponent(form.id)}`}>
                {t("need_help")}
              </Button>
            </div>
          </FormCard>
        )}
      </div>
    </div>
  );
};

export default function FormEmbed({
  appUrl,
  ...props
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  return (
    <>
      <Toaster position="bottom-right" />
      <SingleForm
        {...props}
        appUrl={appUrl}
        Page={({ hookForm, form, uptoDateForm }) => (
          <FormSettings appUrl={appUrl} hookForm={hookForm} form={form} uptoDateForm={uptoDateForm} />
        )}
      />
    </>
  );
}
