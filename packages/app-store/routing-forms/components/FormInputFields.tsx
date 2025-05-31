import type { App_RoutingForms_Form } from "@prisma/client";
import type { Dispatch, SetStateAction } from "react";

import { ComponentForField } from "@calcom/features/form-builder/FormBuilderField";
import { SkeletonText } from "@calcom/ui/components/skeleton";

import isRouterLinkedField from "../lib/isRouterLinkedField";
import type { SerializableForm, FormResponse } from "../types/types";

export type FormInputFieldsProps = {
  form: Pick<SerializableForm<App_RoutingForms_Form>, "fields">;
  /**
   * Make sure that response is updated by setResponse
   */
  response: FormResponse;
  setResponse: Dispatch<SetStateAction<FormResponse>>;
  /**
   * Identifier of the fields that should be disabled
   */
  disabledFields?: string[];
};

export default function FormInputFields(props: FormInputFieldsProps) {
  const { form, response, setResponse } = props;

  return (
    <>
      {form.fields?.map((field) => {
        if (isRouterLinkedField(field)) {
          // @ts-expect-error FIXME @hariombalhara
          const routerField = field.routerField;
          // A field that has been deleted from the main form would still be there in the duplicate form but disconnected
          // In that case, it could mistakenly be categorized as RouterLinkedField, so if routerField is nullish, we use the field itself
          field = routerField ?? field;
        }

        return (
          <div key={field.id} className="my-5 block flex-col sm:flex ">
            <ComponentForField
              field={field}
              // @ts-expect-error FIXME @hariombalhara
              value={response[field.id]?.value ?? undefined}
              setValue={(val: any) => {
                setResponse(() => {
                  return {
                    ...response,
                    [field.id]: {
                      label: field.label,
                      identifier: field?.identifier,
                      fieldType: field.type,
                      value: val,
                    },
                  };
                });
              }}
              readOnly={false}
            />
          </div>
        );
      })}
    </>
  );
}

export const FormInputFieldsSkeleton = () => {
  const numberOfFields = 5;
  return (
    <>
      {Array.from({ length: numberOfFields }).map((_, index) => (
        <div key={index} className="mb-4 block flex-col sm:flex ">
          <SkeletonText className="mb-2 h-3.5 w-64" />
          <SkeletonText className="mb-2 h-9 w-32 w-full" />
        </div>
      ))}
    </>
  );
};
