import type { App_RoutingForms_Form } from "@prisma/client";
import type { Dispatch, SetStateAction } from "react";

import { SkeletonText } from "@calcom/ui";

import getFieldIdentifier from "../lib/getFieldIdentifier";
import { getQueryBuilderConfigForFormFields } from "../lib/getQueryBuilderConfig";
import isRouterLinkedField from "../lib/isRouterLinkedField";
import { getUIOptionsForSelect } from "../lib/selectOptions";
import { getFieldResponseForJsonLogic } from "../lib/transformResponse";
import type { SerializableForm, FormResponse } from "../types/types";
import { ConfigFor, withRaqbSettingsAndWidgets } from "./react-awesome-query-builder/config/uiConfig";

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
  const { form, response, setResponse, disabledFields = [] } = props;

  const formFieldsQueryBuilderConfig = withRaqbSettingsAndWidgets({
    config: getQueryBuilderConfigForFormFields(form),
    configFor: ConfigFor.FormFields,
  });

  return (
    <>
      {form.fields?.map((field) => {
        if (isRouterLinkedField(field)) {
          // @ts-expect-error FIXME @hariombalhara
          field = field.routerField;
        }
        const widget = formFieldsQueryBuilderConfig.widgets[field.type];
        if (!("factory" in widget)) {
          return null;
        }
        const Component = widget.factory;

        const options = getUIOptionsForSelect(field);
        const fieldIdentifier = getFieldIdentifier(field);
        return (
          <div key={field.id} className="mb-4 block flex-col sm:flex ">
            <div className="min-w-48 mb-2 flex-grow">
              <label id="slug-label" htmlFor="slug" className="text-default flex text-sm font-medium">
                {field.label}
              </label>
            </div>
            <Component
              value={response[field.id]?.value ?? ""}
              placeholder={field.placeholder ?? ""}
              // required property isn't accepted by query-builder types
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              /* @ts-ignore */
              required={!!field.required}
              listValues={options}
              disabled={disabledFields?.includes(fieldIdentifier)}
              data-testid={`form-field-${fieldIdentifier}`}
              setValue={(value: number | string | string[]) => {
                setResponse(() => {
                  return {
                    ...response,
                    [field.id]: {
                      label: field.label,
                      identifier: field?.identifier,
                      value: getFieldResponseForJsonLogic({ field, value }),
                    },
                  };
                });
              }}
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
