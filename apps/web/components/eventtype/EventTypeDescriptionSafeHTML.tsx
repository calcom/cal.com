export type EventTypeDescriptionSafeProps = {
  eventType: { description: string | null; descriptionAsSafeHTML: string | null };
};

export const EventTypeDescriptionSafeHTML = ({ eventType }: EventTypeDescriptionSafeProps) => {
  const props: JSX.IntrinsicElements["div"] = { suppressHydrationWarning: true };
  // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized via descriptionAsSafeHTML
  if (eventType.description)
    props.dangerouslySetInnerHTML = { __html: eventType.descriptionAsSafeHTML || "" };
  return <div {...props} />;
};

export default EventTypeDescriptionSafeHTML;
