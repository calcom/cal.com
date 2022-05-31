import { PlusIcon } from "@heroicons/react/solid";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { Controller } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@calcom/ui/Dialog";
import { Form } from "@calcom/ui/form/fields";

import { WORKFLOW_TRIGGER_EVENTS } from "@lib/workflows/constants";
import { WORKFLOW_ACTIONS } from "@lib/workflows/constants";

import Select from "@components/ui/form/Select";

export function NewWorkflowButton() {
  const { t } = useLocale();

  const form = useForm<{
    trigger: string;
    action: string;
  }>();

  const triggers = WORKFLOW_TRIGGER_EVENTS.map((triggerEvent) => {
    return { label: t(`${triggerEvent.toLowerCase()}_trigger`), value: triggerEvent };
  });

  const actions = WORKFLOW_ACTIONS.map((action) => {
    return { label: t(`${action.toLowerCase()}_action`), value: action };
  });

  return (
    <Dialog name="new-workflow" clearQueryParamsOnClose={["copy-schedule-id"]}>
      <DialogTrigger asChild>
        <Button data-testid={name} StartIcon={PlusIcon}>
          {t("new_workflow_btn")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <div className="mb-4">
          <h3 className="text-lg font-bold leading-6 text-gray-900" id="modal-title">
            {t("add_new_workflow")}
          </h3>
        </div>
        <Form
          form={form}
          handleSubmit={(values) => {
            console.log(values);
          }}>
          <>
            <div className="mt-5 space-y-2">
              <label htmlFor="label" className="block text-sm font-medium text-gray-700">
                {t("trigger")}:
              </label>
              <div className="mt-1">
                <Controller
                  name="trigger"
                  control={form.control}
                  render={() => {
                    return (
                      <Select
                        isSearchable={false}
                        className="block w-full min-w-0 flex-1 rounded-sm sm:text-sm"
                        onChange={(val) => {
                          if (val) {
                            form.setValue("trigger", val.value);
                          }
                        }}
                        options={triggers}
                      />
                    );
                  }}
                />
              </div>
            </div>
            <div className="mt-5 space-y-2">
              <label htmlFor="label" className="block text-sm font-medium text-gray-700">
                {t("action")}:
              </label>
              <div className="mt-1">
                <Controller
                  name="action"
                  control={form.control}
                  render={() => {
                    return (
                      <Select
                        isSearchable={false}
                        className="block w-full min-w-0 flex-1 rounded-sm sm:text-sm"
                        onChange={(val) => {
                          if (val) {
                            form.setValue("action", val.value);
                          }
                        }}
                        options={actions}
                      />
                    );
                  }}
                />
              </div>
            </div>
          </>
          <div className="mt-8 flex flex-row-reverse gap-x-2">
            <Button type="submit">{t("continue")}</Button>
            <DialogClose asChild>
              <Button color="secondary">{t("cancel")}</Button>
            </DialogClose>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
