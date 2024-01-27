import type { EventTypeCustomInput } from "@prisma/client";
import { isValidPhoneNumber } from "libphonenumber-js";
import z from "zod"

export function handleCustomInputs(
    eventTypeCustomInputs: EventTypeCustomInput[],
    reqCustomInputs: {
      value: string | boolean;
      label: string;
    }[]
  ) {
    eventTypeCustomInputs.forEach((etcInput) => {
      if (etcInput.required) {
        const input = reqCustomInputs.find((i) => i.label === etcInput.label);
        if (etcInput.type === "BOOL") {
          z.literal(true, {
            errorMap: () => ({ message: `Missing ${etcInput.type} customInput: '${etcInput.label}'` }),
          }).parse(input?.value);
        } else if (etcInput.type === "PHONE") {
          z.string({
            errorMap: () => ({
              message: `Missing ${etcInput.type} customInput: '${etcInput.label}'`,
            }),
          })
            .refine((val) => isValidPhoneNumber(val), {
              message: "Phone number is invalid",
            })
            .parse(input?.value);
        } else {
          // type: NUMBER are also passed as string
          z.string({
            errorMap: () => ({ message: `Missing ${etcInput.type} customInput: '${etcInput.label}'` }),
          })
            .min(1)
            .parse(input?.value);
        }
      }
    });
  }