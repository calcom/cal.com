import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, Dialog, DialogContent, SelectField, Form, TextField, DialogFooter } from "@calcom/ui";

const directoryProviders = [
  {
    label: "SCIM Generic v2.0",
    value: "generic-scim-v2",
  },
  {
    label: "Azure SCIM v2.0",
    value: "azure-scim-v2",
  },
  {
    label: "OneLogin SCIM v2.0",
    value: "onelogin-scim-v2",
  },
  {
    label: "Okta SCIM v2.0",
    value: "okta-scim-v2",
  },
  {
    label: "JumpCloud v2.0",
    value: "jumpcloud-scim-v2",
  },
];

const CreateDirectoryDialog = ({
  teamId,
  openModal,
  setOpenModal,
}: {
  teamId: number | null;
  openModal: boolean;
  setOpenModal: (open: boolean) => void;
}) => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const form = useForm<{
    name: string;
    type: string;
  }>();

  // const mutation = trpc.viewer.scim.create.useMutation({
  //   async onSuccess() {
  //     showToast(t("scim_connection_created_successfully"), "success");
  //     setOpenModal(false);
  //     await utils.viewer.scim.get.invalidate();
  //   },
  //   onError: (err) => {
  //     showToast(err.message, "error");
  //   },
  // });

  return (
    <Dialog open={openModal} onOpenChange={setOpenModal}>
      <DialogContent type="creation">
        <Form
          form={form}
          handleSubmit={({ name, type }) => {
            console.log({ name, type, teamId });

            // mutation.mutate({
            //   teamId,
            //   name,
            //   type,
            // });
          }}>
          <div className="mb-5 mt-1">
            <h2 className="font-semi-bold font-cal text-emphasis text-xl tracking-wide">
              Configure Directory Sync
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Choose an identity provider to configure directory for your team.
            </p>
          </div>
          <fieldset className="space-y-6">
            <Controller
              control={form.control}
              name="name"
              render={({ field: { value } }) => (
                <TextField
                  name="title"
                  label="Directory Name"
                  value={value}
                  onChange={(e) => {
                    form.setValue("name", e?.target.value);
                  }}
                  type="text"
                  required
                />
              )}
            />
            <Controller
              control={form.control}
              name="type"
              render={() => (
                <SelectField
                  name="type"
                  label="Directory Provider"
                  options={directoryProviders}
                  placeholder={t("choose_directory_provider")}
                  defaultValue={directoryProviders[0]}
                  onChange={(option) => {
                    if (!option) {
                      return;
                    }

                    form.setValue("type", option?.value);
                  }}
                />
              )}
            />
          </fieldset>
          <DialogFooter>
            <Button
              type="button"
              color="secondary"
              onClick={() => {
                setOpenModal(false);
              }}
              tabIndex={-1}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {t("save")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDirectoryDialog;
