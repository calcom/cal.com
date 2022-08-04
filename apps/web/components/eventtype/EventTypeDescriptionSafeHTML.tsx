export type EventTypeDescriptionSafeProps = {
  eventType: { description: string | null };
};

export const EventTypeDescriptionSafeHTML = ({ eventType }: EventTypeDescriptionSafeProps) => {
  return eventType.description ? (
    // @ts-expect-error: @see packages/prisma/middleware/eventTypeDescriptionParseAndSanitize.ts
    <div dangerouslySetInnerHTML={{ __html: eventType.descriptionAsSafeHTML }} />
  ) : null;
};

export default EventTypeDescriptionSafeHTML;
