import Handlebars from "handlebars";

export const buildMessageTemplate = ({
  messageTemplate,
  subjectTemplate,
  vars,
}): { subject: string; message: string } => {
  const buildMessage = Handlebars.compile(messageTemplate);
  const message = buildMessage(vars);

  const buildSubject = Handlebars.compile(subjectTemplate);
  const subject = buildSubject(vars);
  return {
    subject,
    message,
  };
};

export default buildMessageTemplate;
