import { useRouter } from "next/router";
import { ReactNode, useEffect } from "react";
import { useForm, UseFormReturn } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import { Form } from "@calcom/ui/form/fields";
import { ButtonGroup, Button, TextAreaField, TextField, Tooltip } from "@calcom/ui/v2";
import { DropdownMenuSeparator, showToast } from "@calcom/ui/v2";
import Shell from "@calcom/ui/v2/core/Shell";
import Banner from "@calcom/ui/v2/core/banner";

import { EmbedButton } from "@components/Embed";

import RoutingNavBar from "../components/RoutingNavBar";
import { SerializableForm } from "../types/types";
import { FormAction, FormActionsDropdown, FormActionsProvider } from "./FormActions";
import { App_RoutingForms_Form } from ".prisma/client";

type RoutingForm = SerializableForm<App_RoutingForms_Form>;
const RoutingShell = function RoutingShell({
  children,
  form,
  heading,
  appUrl,
  setHookForm,
}: {
  form: RoutingForm & {
    _count?: {
      responses: number;
    };
  };
  heading: ReactNode;
  appUrl: string;
  children: ReactNode;
  setHookForm: React.Dispatch<React.SetStateAction<UseFormReturn<RoutingForm> | null>>;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();

  const mutation = trpc.useMutation("viewer.app_routing_forms.form", {
    onSuccess() {
      router.replace(router.asPath);
      showToast("Form updated successfully.", "success");
    },
    onError() {
      showToast(`Something went wrong`, "error");
    },
    onSettled() {
      utils.invalidateQueries(["viewer.app_routing_forms.form"]);
    },
  });

  const hookForm = useForm({
    defaultValues: form,
  });

  useEffect(() => {
    setHookForm(hookForm);
  }, [hookForm, setHookForm]);

  return (
    <Form
      form={hookForm}
      handleSubmit={(data) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        mutation.mutate({
          ...data,
        });
      }}>
      <FormActionsProvider appUrl={appUrl}>
        <Shell
          heading={heading}
          backPath={`/${appUrl}/forms`}
          subtitle={form.description || ""}
          CTA={
            <div className="flex items-center">
              <div className="hidden md:inline-flex md:items-center ">
                <FormAction
                  className="self-center border-r-2 border-gray-300 pr-5 "
                  data-testid="toggle-form"
                  action="toggle"
                  routingForm={form}
                />
              </div>
              <ButtonGroup
                combined
                containerProps={{ className: "px-4 border-gray-300 hidden md:inline-flex items-center" }}>
                <Tooltip content={t("preview")}>
                  <FormAction
                    routingForm={form}
                    color="secondary"
                    target="_blank"
                    size="icon"
                    type="button"
                    rel="noreferrer"
                    action="preview"
                    StartIcon={Icon.FiExternalLink}
                    combined
                  />
                </Tooltip>
                <FormAction
                  routingForm={form}
                  action="copyLink"
                  color="secondary"
                  size="icon"
                  type="button"
                  StartIcon={Icon.FiLink}
                  tooltip={t("copy_link")}
                  combined
                />
                <Tooltip content="Download Responses">
                  <FormAction
                    data-testid="download-responses"
                    routingForm={form}
                    action="download"
                    color="secondary"
                    size="icon"
                    type="button"
                    StartIcon={Icon.FiDownload}
                    combined
                  />
                </Tooltip>
                <FormAction
                  routingForm={form}
                  action="embed"
                  color="secondary"
                  size="icon"
                  StartIcon={Icon.FiCode}
                  tooltip={t("embed")}
                  combined
                />
                <FormAction
                  routingForm={form}
                  action="_delete"
                  // className="mr-3"
                  size="icon"
                  StartIcon={Icon.FiTrash}
                  color="secondary"
                  type="button"
                  tooltip={t("delete")}
                  combined
                />
              </ButtonGroup>
              <div className="flex md:hidden">
                <FormActionsDropdown form={form}>
                  <FormAction
                    action="preview"
                    routingForm={form}
                    className="w-full"
                    color="minimal"
                    type="button"
                    StartIcon={Icon.FiExternalLink}>
                    Download Responses
                  </FormAction>
                  <FormAction
                    action="copyLink"
                    className="w-full"
                    routingForm={form}
                    color="minimal"
                    type="button"
                    StartIcon={Icon.FiCopy}>
                    {t("copy")}
                  </FormAction>
                  <FormAction
                    action="download"
                    routingForm={form}
                    className="w-full"
                    color="minimal"
                    type="button"
                    StartIcon={Icon.FiDownload}>
                    Download Responses
                  </FormAction>
                  <FormAction
                    action="embed"
                    routingForm={form}
                    color="minimal"
                    type="button"
                    className="w-full"
                    StartIcon={Icon.FiCode}>
                    {t("embed")}
                  </FormAction>
                  <FormAction
                    action="_delete"
                    routingForm={form}
                    className="w-full"
                    type="button"
                    color="destructive"
                    StartIcon={Icon.FiTrash}>
                    {t("delete")}
                  </FormAction>
                  <DropdownMenuSeparator className="h-px bg-gray-200" />
                  <div className="inline-flex items-center">
                    <Button color="minimal">
                      <FormAction
                        className="self-center"
                        action="toggle"
                        label="Hide from profile"
                        routingForm={form}
                      />
                    </Button>
                  </div>
                </FormActionsDropdown>
              </div>
              <div className="mr-4 h-5 border-0 border-gray-300 md:border-l-2" />
              <Button data-testid="update-form" loading={mutation.isLoading} type="submit" color="primary">
                {t("save")}
              </Button>
            </div>
          }>
          <div className="-mx-4 px-4 sm:px-6 md:-mx-8 md:px-8">
            <div className="flex flex-col items-center md:flex-row md:items-start">
              <div className="min-w-72 max-w-72 mb-6 md:mr-6">
                <TextField
                  type="text"
                  containerClassName="mb-6"
                  placeholder="Title"
                  {...hookForm.register("name")}
                />
                <TextAreaField
                  rows={3}
                  id="description"
                  data-testid="description"
                  placeholder="Form Description"
                  {...hookForm.register("description")}
                  defaultValue={form.description || ""}
                />
                {!form._count?.responses && (
                  <Banner
                    className="mt-6"
                    variant="neutral"
                    title="No Responses yet"
                    description="Wait for some time for responses to be collected. You can go and submit the form yourself as well."
                    Icon={Icon.FiInfo}
                    onDismiss={() => console.log("dismissed")}
                  />
                )}
              </div>
              <div className="w-full rounded-md border border-gray-200 p-8">
                <RoutingNavBar appUrl={appUrl} form={form} />
                {children}
              </div>
            </div>
          </div>
        </Shell>
      </FormActionsProvider>
    </Form>
  );
};
export default RoutingShell;
