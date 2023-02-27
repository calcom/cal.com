import type { App_RoutingForms_Form } from "@prisma/client";

import { BaseEmailHtml, Info } from "@calcom/emails/src/components";
import { WEBAPP_URL } from "@calcom/lib/constants";

import type { Response } from "../../types/types";

export const ResponseEmail = ({
  form,
  response,
  ...props
}: {
  form: Pick<App_RoutingForms_Form, "id" | "name">;
  response: Response;
  subject: string;
} & Partial<React.ComponentProps<typeof BaseEmailHtml>>) => {
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
            <a href={`${WEBAPP_URL}/apps/routing-forms/form-edit/${form.id}`} style={{ color: "#3e3e3e" }}>
              <>Manage this form</>
            </a>
          </p>
        </div>
      }
      title={form.name}
      subtitle="New Response Received"
      {...props}>
      {Object.entries(response).map(([fieldId, fieldResponse]) => {
        return (
          <Info
            withSpacer
            key={fieldId}
            label={fieldResponse.label}
            description={
              fieldResponse.value instanceof Array ? fieldResponse.value.join(",") : fieldResponse.value
            }
          />
        );
      })}
    </BaseEmailHtml>
  );
};
