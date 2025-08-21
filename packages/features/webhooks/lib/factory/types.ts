export interface FormSubmittedPayload {
  form: {
    id: string;
    name: string;
  };
  response: {
    id: number;
    data: Record<string, any>;
  };
}

export interface RecordingPayload {
  downloadLink?: string;
  downloadLinks?: {
    transcription?: Array<{
      format: string;
      link: string;
    }>;
    recording?: string;
  };
}

export interface WebhookPayload {
  triggerEvent: string;
  createdAt: string;
  payload:
    | EventPayloadType
    | OOOEntryPayloadType
    | BookingNoShowUpdatedPayload
    | FormSubmittedPayload
    | RecordingPayload;
}
