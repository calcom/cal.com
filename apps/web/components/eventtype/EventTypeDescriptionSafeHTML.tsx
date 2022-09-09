export type EventTypeDescriptionSafeProps = {
  eventType: { description: string | null; isDynamic?: boolean };
};

export const EventTypeDescriptionSafeHTML = ({ eventType }: EventTypeDescriptionSafeProps) => {
  const props: JSX.IntrinsicElements["div"] = { suppressHydrationWarning: true };
  // @ts-expect-error: @see packages/prisma/middleware/eventTypeDescriptionParseAndSanitize.ts
  if (eventType.description) props.dangerouslySetInnerHTML = { __html: eventType.descriptionAsSafeHTML };
  // Dynamic link description is not set/pulled from the DB, hence we can allow it here as is
  if (eventType.isDynamic) props.dangerouslySetInnerHTML = { __html: eventType.description || "" };
  return <div {...props} />;
};

export default EventTypeDescriptionSafeHTML;
