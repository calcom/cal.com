export type Message<TPayload = unknown> = {
  type: string;
  payload: TPayload;
};

export type EmitOptions = {
  skipPersistentQueue?: boolean;
};

export interface IMessageHandler<TMessage extends string, TPayloadMap extends Record<TMessage, unknown>> {
  subscribedMessage: TMessage;
  handle(message: Message<TPayloadMap[TMessage]>): Promise<void>;
  isEnabled?(message: Message<TPayloadMap[TMessage]>): boolean;
  forPersistentQueue?: boolean;
}

// Wildcard handler interface - allows handling any message type
export interface IWildcardMessageHandler<TPayloadMap = Record<string, unknown>> {
  subscribedMessage: "*";
  handle(message: Message<unknown>): Promise<void>;
  isEnabled?(message: Message<unknown>): boolean;
  forPersistentQueue?: boolean;
}
