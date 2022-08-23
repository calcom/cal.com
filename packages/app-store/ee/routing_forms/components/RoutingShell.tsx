import { useRouter } from "next/router";
import { ReactNode, useEffect } from "react";
import { useForm } from "react-hook-form";

import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import { Form } from "@calcom/ui/form/fields";
import { ButtonGroup, Button, TextAreaField, TextField, Tooltip } from "@calcom/ui/v2";
import { DropdownMenuSeparator } from "@calcom/ui/v2";
import Shell from "@calcom/ui/v2/core/Shell";
import Banner from "@calcom/ui/v2/core/banner";

import { EmbedButton } from "@components/Embed";

import RoutingNavBar from "../components/RoutingNavBar";
import { getSerializableForm } from "../lib/getSerializableForm";
import { FormAction, FormActionsDropdown, FormActionsProvider } from "./FormActions";

const RoutingShell: React.FC<{
  form: ReturnType<typeof getSerializableForm>;
  heading: ReactNode;
  appUrl: string;
  children: ReactNode;
  setHookForm: () => void;
}> = function RoutingShell({ children, form, heading, appUrl, setHookForm }) {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();

  const mutation = trpc.useMutation("viewer.app_routing_forms.form", {
    onSuccess() {
      router.replace(router.asPath);
    },
    onError() {
      showToast(`Something went wrong`, "error");
    },
    onSettled() {
      utils.invalidateQueries(["viewer.app_routing_forms.form"]);
    },
  });

  const deleteMutation = trpc.useMutation("viewer.app_routing_forms.deleteForm", {
    onError() {
      showToast(`Something went wrong`, "error");
    },
    onSuccess() {
      router.push(`/${appUrl}/forms`);
    },
  });
  const fieldsNamespace = "fields";
  const hookForm = useForm({
    defaultValues: form,
  });

  useEffect(() => {
    setHookForm(hookForm);
  }, [hookForm]);

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
            <>
              <ButtonGroup
                combined
                containerProps={{ className: "px-4 border-gray-300 hidden md:flex items-center" }}>
                <div className="hidden md:inline-flex md:items-center ">
                  <FormAction
                    className="self-center border-r-2 border-gray-300 pr-5 "
                    action="toggle"
                    form={form}
                  />
                </div>
                <Tooltip content={t("preview")}>
                  <FormAction
                    form={form}
                    action="preview"
                    target="_blank"
                    color="secondary"
                    size="icon"
                    className="ml-3"
                    StartIcon={Icon.FiExternalLink}
                    combined
                  />
                </Tooltip>
                <FormAction
                  form={form}
                  action="copyLink"
                  color="secondary"
                  size="icon"
                  StartIcon={Icon.FiLink}
                  label={t("copy_link")}
                  combined
                />
                <FormAction
                  form={form}
                  action="download"
                  color="secondary"
                  size="icon"
                  StartIcon={Icon.FiDownload}
                  label="Download Responses"
                  combined
                />
                <FormAction
                  form={form}
                  action="embed"
                  color="secondary"
                  size="icon"
                  StartIcon={Icon.FiCode}
                  label={t("embed")}
                  combined
                />
                <FormAction
                  form={form}
                  action="_delete"
                  // className="mr-3"
                  size="icon"
                  StartIcon={Icon.FiTrash}
                  color="secondary"
                  label={t("delete")}
                  combined
                />
                <FormAction
                  action="duplicate"
                  form={form}
                  className="mr-3"
                  size="icon"
                  data-testid={"routing-form-duplicate-" + form.id}
                  StartIcon={Icon.FiCopy}
                  color="secondary"
                  label={t("duplicate")}
                  combined
                />

                <div className="h-5 w-3 border-l-2 border-gray-300" />
                <FormAction action="save" combined color="primary" form={form}>
                  Save
                </FormAction>
              </ButtonGroup>
              <div className="flex md:hidden">
                <FormActionsDropdown form={form}>
                  <FormAction action="preview" form={form} color="minimal" StartIcon={Icon.FiExternalLink}>
                    Download Responses
                  </FormAction>
                  <FormAction action="copyLink" form={form} color="minimal" StartIcon={Icon.FiCopy}>
                    {t("copy")}
                  </FormAction>
                  <FormAction action="download" form={form} color="minimal" StartIcon={Icon.FiDownload}>
                    Download Responses
                  </FormAction>
                  <FormAction action="embed" form={form} color="minimal" StartIcon={Icon.FiCode}>
                    {t("embed")}
                  </FormAction>
                  <FormAction
                    action="_delete"
                    form={form}
                    className="w-full"
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
                        form={form}
                        label="Hide from profile"
                      />
                    </Button>
                  </div>
                </FormActionsDropdown>
              </div>
            </>
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
                {!form._count.responses && (
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
