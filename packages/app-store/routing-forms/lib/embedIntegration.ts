import {
  createPostMessageRouter,
  sdkActionManager,
  type PostMessageHandlers,
} from "@calid/embed-runtime/embed-iframe";

import type { FormResponse, Field } from "../types/types";

export type LastChangedField = {
  id: string;
  identifier: string;
  label: string;
  type: string;
  value: unknown;
};

export type RoutingFormChangePayload = {
  fields: FormResponse;
  lastChangedField: LastChangedField;
};

export type FormSubmissionPayload = {
  submissionId: string;
  formId: string;
  response: FormResponse;
  chosenRouteId?: string;
  redirectUrl?: string | null;
  formResponseId?: number | null;
  queuedFormResponseId?: number | null;
};

export type EmbedCommandHandlers = {
  onSetFieldValue: (fieldIdentifier: string, value: number | string | string[]) => void;
  onSetCalendarEventType: (eventType: string, fieldIdentifier?: string) => void;
  onAck: (submissionId: string, redirectUrl?: string) => void;
};

const getAllowedOrigin = (): string | null => {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const explicit = params.get("cal.embed.origin");
  if (explicit) return explicit;
  if (!document.referrer) return null;
  try {
    return new URL(document.referrer).origin;
  } catch {
    return null;
  }
};

export const isIntegrationEnabled = (isEmbed: boolean): boolean => !!isEmbed;

export const emitRoutingEvent = (
  type: "routing_form_change" | "form_submission",
  payload: RoutingFormChangePayload | FormSubmissionPayload
) => {
  sdkActionManager?.fire(type as any, payload as any);
};

export const attachCommandListener = (handlers: EmbedCommandHandlers) => {
  if (typeof window === "undefined") return () => {};
  const allowedOrigin = getAllowedOrigin();
  const namespace = window.getEmbedNamespace?.() ?? null;

  const router = createPostMessageRouter({
    namespace,
    allowedOrigins: allowedOrigin ? [allowedOrigin] : undefined,
    handlers: {
      set_calendar_event_type: (msg) => {
        handlers.onSetCalendarEventType(
          msg.payload.eventType as string,
          msg.payload.fieldIdentifier as string | undefined
        );
      },
      set_field_value: (msg) => {
        console.log(" handlers.onSetFieldValue( ")
        handlers.onSetFieldValue(
          msg.payload.fieldIdentifier as string,
          msg.payload.value as number | string | string[]
        );
      },
      booking_acknowledgement: (msg) => {
        handlers.onAck(
          msg.payload.submissionId as string,
          msg.payload.redirect_url as string | undefined
        );
      },
    } satisfies PostMessageHandlers,
  });

  router.attach();
  return () => router.detach();
};

export const isSelectableFieldType = (field: Field): boolean =>
  ["select", "multiselect", "radio", "checkbox", "boolean", "calendar"].includes(field.type);
