import Handlebars from "handlebars";
import { TFunction } from "next-i18next";

export type VarType = {
  language: TFunction;
  user: {
    name: string | null;
  };
  link: string;
};

export type MessageTemplateTypes = {
  messageTemplate: string;
  subjectTemplate: string;
  vars: VarType;
};

export type BuildTemplateResult = {
  subject: string;
  message: string;
};

export const buildMessageTemplate = ({
  messageTemplate,
  subjectTemplate,
  vars,
}: MessageTemplateTypes): BuildTemplateResult => {
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
