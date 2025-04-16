/* eslint-disable @typescript-eslint/no-empty-function */
import type { TFunction } from "i18next";
import { isValidPhoneNumber } from "libphonenumber-js";
// eslint-disable-next-line @calcom/eslint/deprecated-imports-next-router
import { z } from "zod";

import { getEventLocationType } from "@calcom/app-store/locations";

export const locationsResolver = (t: TFunction) => {
  return z
    .array(
      z
        .object({
          type: z.string(),
          address: z.string().optional(),
          link: z.string().url().optional(),
          phone: z
            .string()
            .refine((val) => isValidPhoneNumber(val))
            .optional(),
          hostPhoneNumber: z
            .string()
            .refine((val) => isValidPhoneNumber(val))
            .optional(),
          displayLocationPublicly: z.boolean().optional(),
          credentialId: z.number().optional(),
          teamName: z.string().optional(),
        })
        .passthrough()
        .superRefine((val, ctx) => {
          if (val?.link) {
            const link = val.link;
            const eventLocationType = getEventLocationType(val.type);
            if (
              eventLocationType &&
              !eventLocationType.default &&
              eventLocationType.linkType === "static" &&
              eventLocationType.urlRegExp
            ) {
              const valid = z.string().regex(new RegExp(eventLocationType.urlRegExp)).safeParse(link).success;

              if (!valid) {
                const sampleUrl = eventLocationType.organizerInputPlaceholder;
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  path: [eventLocationType?.defaultValueVariable ?? "link"],
                  message: t("invalid_url_error_message", {
                    label: eventLocationType.label,
                    sampleUrl: sampleUrl ?? "https://cal.com",
                  }),
                });
              }
              return;
            }

            const valid = z.string().url().optional().safeParse(link).success;

            if (!valid) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [eventLocationType?.defaultValueVariable ?? "link"],
                message: `Invalid URL`,
              });
            }
          }
          return;
        })
    )
    .optional();
};
