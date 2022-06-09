import { TrashIcon } from "@heroicons/react/solid";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";

import { withQuery } from "@calcom/lib/QueryCell";
import showToast from "@calcom/lib/notification";
import { Button, Select } from "@calcom/ui";
import { Form } from "@calcom/ui/form/fields";
import { trpc } from "@calcom/web/lib/trpc";

import PencilEdit from "@components/PencilEdit";

import RoutingNavBar from "../components/RoutingNavBar";
import RoutingShell from "../components/RoutingShell";

export const FieldTypes = [
  {
    label: "Short Text",
    value: "text",
  },
  {
    label: "Number",
    value: "number",
  },
  {
    label: "Long Text",
    value: "textarea",
  },
];

function Field({ field, hookForm, hookFieldNamespace, deleteField, readonly = false }) {
  const fieldType = FieldTypes.find((f) => field.type === f.value) || FieldTypes[0];
  return (
    <div className="mb-4 w-full max-w-4xl ltr:mr-2 rtl:ml-2 lg:w-9/12">
      <div className="-mx-4 rounded-sm border border-neutral-200 bg-white p-4 py-6 sm:mx-0 sm:px-8">
        <button
          className="float-right"
          onClick={() => {
            deleteField();
          }}
          color="secondary">
          <TrashIcon className="h-4 w-4"></TrashIcon>
        </button>
        <div className="space-y-3">
          <div className="block sm:flex">
            <div className="min-w-48 mb-4 mt-2.5 sm:mb-0">
              <label htmlFor="label" className="mt-0 flex text-sm font-medium text-neutral-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 text-neutral-500 ltr:mr-2 rtl:ml-2">
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                    clipRule="evenodd"
                  />
                </svg>
                Label
              </label>
            </div>
            <div className="w-1/4">
              <input
                {...hookForm.register(`${hookFieldNamespace}.label`)}
                className=" block w-full rounded-sm border-gray-300 text-sm shadow-sm"
              />
            </div>
          </div>
          <div className="block sm:flex">
            <div className="min-w-48 mb-4 mt-2.5 sm:mb-0">
              <label htmlFor="label" className="mt-0 flex text-sm font-medium text-neutral-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 text-neutral-500 ltr:mr-2 rtl:ml-2">
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                    clipRule="evenodd"
                  />
                </svg>
                Type
              </label>
            </div>
            <div className="w-1/4">
              <Controller
                name={`${hookFieldNamespace}.type`}
                control={hookForm.control}
                render={({ field: { value, onChange } }) => {
                  const defaultValue = FieldTypes.find((fieldType) => fieldType.value === value);
                  return (
                    <Select
                      options={FieldTypes}
                      onChange={(option) => {
                        onChange(option.value);
                      }}
                      defaultValue={defaultValue}></Select>
                  );
                }}></Controller>
            </div>
          </div>
          <div className="block sm:flex">
            <div className="min-w-48 mb-4 mt-2.5 sm:mb-0">
              <label htmlFor="label" className="mt-0 flex text-sm font-medium text-neutral-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 text-neutral-500 ltr:mr-2 rtl:ml-2">
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                    clipRule="evenodd"
                  />
                </svg>
                Required
              </label>
            </div>
            <div className="w-full">
              <input type="checkbox" {...hookForm.register(`${hookFieldNamespace}.required`)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FormBuilder({ subPages, Page404 }: { subPages: string[] }) {
  const router = useRouter();
  const formId = subPages[0];

  if (subPages.length > 1) {
    return <Page404 />;
  }

  const WithQuery = withQuery([
    "viewer.app_routing_forms.form",
    {
      id: formId,
    },
  ]);

  return (
    <WithQuery
      success={function RoutingForm(props) {
        const utils = trpc.useContext();

        const mutation = trpc.useMutation("viewer.app_routing_forms.form", {
          onError() {
            showToast(`Something went wrong`, "error");
          },
          onSettled() {
            utils.invalidateQueries(["viewer.app_routing_forms.form"]);
          },
        });
        const form = props.data;
        const fieldsNamespace = "fields";
        const hookForm = useForm({
          defaultValues: form,
        });

        const {
          fields: hookFormFields,
          append: appendHookFormField,
          remove: removeHookFormField,
        } = useFieldArray({
          control: hookForm.control,
          name: fieldsNamespace,
        });

        // hookForm.reset(form);
        if (!form.fields) {
          form.fields = [];
        }
        return (
          <RoutingShell
            form={form}
            heading={
              <PencilEdit
                value={form.name}
                onChange={(value) => {
                  mutation.mutate({
                    ...form,
                    name: value,
                  });
                }}></PencilEdit>
            }>
            <Form
              form={hookForm}
              handleSubmit={(data) => {
                mutation.mutate({
                  ...data,
                });
              }}>
              <div className="flex flex-col">
                {hookFormFields.map((field, key) => {
                  return (
                    <Field
                      hookForm={hookForm}
                      hookFieldNamespace={`${fieldsNamespace}.${key}`}
                      deleteField={() => {
                        removeHookFormField(key);
                      }}
                      key={key}
                      field={field}></Field>
                  );
                })}
                {!hookFormFields.length ? "No Fields" : null}
              </div>
              <div className="mt-4 flex w-full  max-w-4xl justify-end space-x-2 rtl:space-x-reverse">
                <Button
                  type="button"
                  className="mr-1 flex"
                  onClick={() => {
                    router.push("/apps/routing_forms/forms");
                  }}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex"
                  onClick={() => {
                    appendHookFormField({
                      // TODO: Should we give it a DB id?
                      id: uuidv4(),
                      // This is same type from react-awesome-query-builder
                      type: "text",
                      label: "Hello",
                    });
                  }}>
                  Add Field
                </Button>
                <Button type="submit" loading={mutation.isLoading}>
                  Submit
                </Button>
              </div>
            </Form>
          </RoutingShell>
        );
      }}></WithQuery>
  );
}
