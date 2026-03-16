import { z } from "zod";

export type PostMessageType = "set_calendar_event_type" | "set_field_value" | "booking_acknowledgement";

export type PostMessageEnvelope<T extends PostMessageType = PostMessageType> = {
  version: 1;
  source: "external_embed" | "cal_embed" | "routing_form";
  type: T;
  payload: Record<string, unknown>;
  namespace?: string;
};

export type PostMessageHandlers = Partial<{
  set_calendar_event_type: (msg: PostMessageEnvelope<"set_calendar_event_type">, meta: MessageMeta) => void;
  set_field_value: (msg: PostMessageEnvelope<"set_field_value">, meta: MessageMeta) => void;
  booking_acknowledgement: (msg: PostMessageEnvelope<"booking_acknowledgement">, meta: MessageMeta) => void;
}>;

export type MessageMeta = {
  origin: string;
  sourceEvent: MessageEvent;
};

export type PostMessageRouter = {
  attach: () => void;
  detach: () => void;
  dispatch: (msg: PostMessageEnvelope, meta: MessageMeta) => void;
};

type AllowedOrigins = string[] | ((origin: string) => boolean) | undefined;

const routers = new Set<InternalRouter>();
let listening = false;

type InternalRouter = {
  namespace?: string | null;
  allowedOrigins?: AllowedOrigins;
  handlers: PostMessageHandlers;
  dispatch: (msg: PostMessageEnvelope, meta: MessageMeta) => void;
};

const isAllowedOrigin = (origin: string, allowed?: AllowedOrigins): boolean => {
  if (!allowed) return true;
  if (Array.isArray(allowed)) return allowed.includes(origin);
  return allowed(origin);
};

const baseEnvelopeSchema = z.object({
  version: z.literal(1),
  source: z.enum(["external_embed", "cal_embed", "routing_form"]),
  type: z.string(),
  payload: z.record(z.unknown()),
  namespace: z.string().optional(),
});

const setCalendarEventTypePayloadSchema = z.object({
  eventType: z.string().min(1),
  fieldIdentifier: z.string().optional(),
});

const setFieldValuePayloadSchema = z.object({
  fieldIdentifier: z.string().min(1),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

const bookingAcknowledgementPayloadSchema = z.object({
  submissionId: z.string().min(1),
  redirect_url: z.string().optional(),
});

export const parsePostMessage = (data: unknown): PostMessageEnvelope | null => {
  const base = baseEnvelopeSchema.safeParse(data);
  if (!base.success) return null;
  const envelope = base.data as PostMessageEnvelope;
  const type = envelope.type as PostMessageType;
  if (!["set_calendar_event_type", "set_field_value", "booking_acknowledgement"].includes(type)) {
    return null;
  }
  if (type === "set_calendar_event_type") {
    return setCalendarEventTypePayloadSchema.safeParse(envelope.payload).success ? envelope : null;
  }
  if (type === "set_field_value") {
    return setFieldValuePayloadSchema.safeParse(envelope.payload).success ? envelope : null;
  }
  if (type === "booking_acknowledgement") {
    return bookingAcknowledgementPayloadSchema.safeParse(envelope.payload).success ? envelope : null;
  }
  return null;
};

const globalHandler = (e: MessageEvent) => {
  console.log("Received event: ", e.data);

  const msg = parsePostMessage(e.data);

  console.log("Received post message: ", msg);

  if (!msg) return;
  routers.forEach((router) => {
    if (router.namespace && msg.namespace && msg.namespace !== router.namespace) return;
    if (!isAllowedOrigin(e.origin, router.allowedOrigins)) return;
    router.dispatch(msg, { origin: e.origin, sourceEvent: e });
  });
};

export const createPostMessageRouter = ({
  namespace,
  allowedOrigins,
  handlers,
}: {
  namespace?: string | null;
  allowedOrigins?: AllowedOrigins;
  handlers: PostMessageHandlers;
}): PostMessageRouter => {
  const internal: InternalRouter = {
    namespace,
    allowedOrigins,
    handlers,
    dispatch: (msg, meta) => {
      const handler = handlers[msg.type as keyof PostMessageHandlers];
      console.log("Handler found: ", handler);
      if (handler) {
        handler(msg as any, meta);
      }
    },
  };

  return {
    attach: () => {
      routers.add(internal);
      if (!listening && typeof window !== "undefined") {
        window.addEventListener("message", globalHandler);
        listening = true;
      }
    },
    detach: () => {
      routers.delete(internal);
      if (listening && routers.size === 0 && typeof window !== "undefined") {
        window.removeEventListener("message", globalHandler);
        listening = false;
      }
    },
    dispatch: internal.dispatch,
  };
};

export const sendPostMessage = (targetWindow: Window, message: PostMessageEnvelope, targetOrigin = "*") => {
  targetWindow.postMessage(message, targetOrigin);
};
