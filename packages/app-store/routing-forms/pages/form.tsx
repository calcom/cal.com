import { TrashIcon } from "@heroicons/react/solid";
import { useRouter } from "next/router";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { Button, Select } from "@calcom/ui";
import { trpc } from "@calcom/web/lib/trpc";

import PencilEdit from "@components/PencilEdit";

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
function Field({ field, updateField, deleteField, readonly = false }) {
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
        <form className="space-y-6">
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
                  id="label"
                  className=" block w-full rounded-sm border-gray-300 text-sm shadow-sm"
                  name="label"
                  value={field.label}
                  onChange={(e) => {
                    updateField({
                      ...field,
                      label: e.target.value,
                    });
                  }}
                  defaultValue={""}
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
                <Select
                  options={FieldTypes}
                  onChange={(fieldType) => {
                    updateField({
                      ...field,
                      type: fieldType?.value,
                    });
                  }}
                  defaultValue={fieldType}></Select>
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
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => {
                    updateField({
                      ...field,
                      required: e.target.checked,
                    });
                  }}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FormBuilder({ subPages, Page404 }: { subPages: string[] }) {
  const router = useRouter();
  const formId = subPages[0];
  // TODO: Handle formId undefined in routing
  const { data: form, isLoading } = trpc.useQuery([
    "viewer.app_routing-forms.form",
    {
      id: formId,
    },
  ]);
  const utils = trpc.useContext();

  const mutation = trpc.useMutation("viewer.app_routing-forms.form", {
    onSettled() {
      utils.invalidateQueries(["viewer.app_routing-forms.form"]);
    },
  });

  const [formName, setFormName] = useState();
  if (subPages.length > 1) {
    return <Page404 />;
  }
  if (!form) {
    if (!isLoading) {
      router.push("/apps/routing-forms/forms");
    }
    return null;
  }
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
      <div className="flex flex-col">
        {form.fields.map((field, key) => {
          return (
            <Field
              updateField={(field) => {
                const index = form.fields.findIndex((f) => f.id === field.id);
                const newFields = [...form.fields];
                newFields[index] = { ...newFields[index], ...field };
                mutation.mutate({
                  ...form,
                  fields: newFields,
                });
                return newFields;
              }}
              deleteField={() => {
                const newFields = form.fields.filter((q) => q.id !== field.id);
                mutation.mutate({
                  ...form,
                  fields: newFields,
                });
              }}
              key={key}
              field={field}></Field>
          );
        })}
        {!form.fields.length ? "No Fields" : null}
      </div>
      <Button
        className="flex"
        onClick={() => {
          const newFields = [
            ...form.fields,
            {
              // TODO: Should we give it a DB id?
              id: uuidv4(),
              // This is same type from react-awesome-query-builder
              type: "text",
              label: "Hello",
            },
          ];
          mutation.mutate({
            ...form,
            fields: newFields,
          });
        }}>
        Add Field
      </Button>
    </RoutingShell>
  );
}
