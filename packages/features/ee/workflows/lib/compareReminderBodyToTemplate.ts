const compareReminderBodyToTemplate = ({
  reminderBody,
  template,
}: {
  reminderBody: string;
  template: string;
}) => {
  const stripHTML = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");

  const stripedReminderBody = stripHTML(reminderBody);
  const stripedTemplate = stripHTML(template);

  return stripedReminderBody === stripedTemplate;
};

export default compareReminderBodyToTemplate;
