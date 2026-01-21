import { BaseEmailHtml, Info } from "@calcom/emails/src/components";
import { WEBAPP_URL } from "@calcom/lib/constants";
import type { App_RoutingForms_Form } from "@calcom/prisma/client";

import type { Fields, OrderedResponses } from "../../types/types";

export const ResponseEmail = ({
  form,
  orderedResponses,
  ...props
}: {
  form: Pick<App_RoutingForms_Form, "id" | "name" | "fields">;
  orderedResponses: OrderedResponses;
  subject: string;
} & Partial<React.ComponentProps<typeof BaseEmailHtml>>) => {
  const formFields = form.fields as Fields;
  return (
    <BaseEmailHtml
      callToAction={
        <div
          style={{
            fontFamily: "Roboto, Helvetica, sans-serif",
            fontSize: "16px",
            fontWeight: 500,
            lineHeight: "0px",
            textAlign: "left",
            color: "#3e3e3e",
          }}>
          <p style={{ fontWeight: 400, lineHeight: "24px" }}>
            <a href={`${WEBAPP_URL}/routing-forms/form-edit/${form.id}`} style={{ color: "#3e3e3e" }}>
              <>Manage this form</>
            </a>
          </p>
        </div>
      }
      title={form.name}
      subtitle="New Response Received"
      {...props}>
      {orderedResponses.map((fieldResponse, index) => {
        const field = formFields?.find((f) => f.label === fieldResponse.label);
        const description =
          fieldResponse.value instanceof Array
            ? fieldResponse.value
                .map((id) => field?.options?.find((opt) => opt.id === id)?.label || id)
                .join(", ")
            : field?.options?.find((opt) => opt.id === fieldResponse.value)?.label || fieldResponse.value;

        return <Info withSpacer key={index} label={fieldResponse.label} description={description} />;
      })}
    </BaseEmailHtml>
  );
};
