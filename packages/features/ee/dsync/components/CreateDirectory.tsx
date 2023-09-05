import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Dialog,
  DialogContent,
  SelectField,
  Form,
  TextField,
  DialogFooter,
  showToast,
} from "@calcom/ui";

import { directoryProviders } from "../lib/utils";

const defaultValues = {
  name: "",
  provider: directoryProviders[0].value,
};

const CreateDirectory = ({ teamId }: { teamId: number | null }) => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const form = useForm({ defaultValues });
  const [openModal, setOpenModal] = useState(false);

  const mutation = trpc.viewer.dsync.create.useMutation({
    async onSuccess() {
      showToast("Directory sync connection created.", "success");
      await utils.viewer.dsync.invalidate();
      setOpenModal(false);
    },
  });

  return (
    <>
      <div className="flex flex-col sm:flex-row">
        <div>
          <p className="text-default text-sm font-normal leading-6 dark:text-gray-300">
            Configure an identity provider to get started with SCIM.
          </p>
        </div>
        <div className="flex-shrink-0 pt-3 sm:ml-auto sm:pl-3 sm:pt-0">
          <Button color="primary" onClick={() => setOpenModal(true)}>
            Configure
          </Button>
        </div>
      </div>

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent type="creation">
          <Form
            form={form}
            handleSubmit={(values) => {
              mutation.mutate({
                ...values,
                teamId,
              });
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
                name="provider"
                render={() => (
                  <SelectField
                    name="provider"
                    label="Directory Provider"
                    options={directoryProviders}
                    placeholder={t("choose_directory_provider")}
                    defaultValue={directoryProviders[0]}
                    onChange={(option) => {
                      if (option) {
                        form.setValue("provider", option.value);
                      }
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
    </>
  );
};

export default CreateDirectory;
