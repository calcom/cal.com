export type EventTypeDescriptionSafeProps = {
  eventType: { description: string | null; descriptionAsSafeHTML: string | null };
};

export const EventTypeDescriptionSafeHTML = ({ eventType }: EventTypeDescriptionSafeProps) => {
  const props: JSX.IntrinsicElements["div"] = { suppressHydrationWarning: true };
  if (eventType.description)
    props.dangerouslySetInnerHTML = { __html: eventType.descriptionAsSafeHTML || "" };
  return <div {...props} />;
};

export default EventTypeDescriptionSafeHTML;
