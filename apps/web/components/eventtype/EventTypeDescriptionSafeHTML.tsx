export type EventTypeDescriptionSafeProps = {
  eventType: { description: string | null };
};

export const EventTypeDescriptionSafeHTML = ({ eventType }: EventTypeDescriptionSafeProps) => {
  const props: JSX.IntrinsicElements["div"] = { suppressHydrationWarning: true };
  if (eventType.description)
    // @ts-expect-error: @see packages/prisma/middleware/eventTypeDescriptionParseAndSanitize.ts
    props.dangerouslySetInnerHTML = { __html: eventType.descriptionAsSafeHTML };
  return <div {...props} />;
};

export default EventTypeDescriptionSafeHTML;
