import { addListFormatting } from "@calcom/lib/markdownIt";

export type EventTypeDescriptionSafeProps = {
  eventType: { description: string | null };
};

export const EventTypeDescriptionSafeHTML = ({ eventType }: EventTypeDescriptionSafeProps) => {
  const props: JSX.IntrinsicElements["div"] = { suppressHydrationWarning: true };
  // @ts-expect-error: @see packages/prisma/middleware/eventTypeDescriptionParseAndSanitize.ts
  if (eventType.description)
    props.dangerouslySetInnerHTML = { __html: addListFormatting(eventType.descriptionAsSafeHTML) };
  return <div {...props} />;
};

export default EventTypeDescriptionSafeHTML;
