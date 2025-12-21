import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { Form, TextField, SelectField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import { directoryProviders } from "../lib/directoryProviders";

const defaultValues = {
  name: "",
  provider: directoryProviders[0].value,
};

const CreateDirectory = ({ orgId }: { orgId: number | null }) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const form = useForm({ defaultValues });
  const [openModal, setOpenModal] = useState(false);

  const mutation = trpc.viewer.dsync.create.useMutation({
    async onSuccess() {
      showToast(t("directory_sync_created"), "success");
      await utils.viewer.dsync.invalidate();
      setOpenModal(false);
    },
  });

  return (
    <>
      <div className="flex flex-col sm:flex-row">
        <div>
          <p className="text-default text-sm font-normal leading-6 dark:text-gray-300">
            {t("directory_sync_title")}
          </p>
        </div>
        <div className="shrink-0 pt-3 sm:ml-auto sm:pl-3 sm:pt-0">
          <Button color="primary" onClick={() => setOpenModal(true)}>
            {t("configure")}
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
                organizationId: orgId,
              });
            }}>
            <div className="mb-5 mt-1">
              <h2 className="font-semi-bold font-cal text-emphasis text-xl tracking-wide">
                {t("directory_sync_configure")}
              </h2>
              <p className="mt-1 text-sm text-gray-500">{t("directory_sync_configure_description")}</p>
            </div>
            <fieldset className="stack-y-6 py-2">
              <Controller
                control={form.control}
                name="name"
                render={({ field: { value } }) => (
                  <TextField
                    name="title"
                    label={t("directory_name")}
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
                    label={t("directory_provider")}
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
              <Button type="submit" loading={form.formState.isSubmitting || mutation.isPending}>
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
