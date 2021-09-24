import buildMessageTemplate from "../../emails/buildMessageTemplate";

export const forgotPasswordSubjectTemplate = "Forgot your password? - Yac Meet";

export const forgotPasswordMessageTemplate = `Hey there,

Use the link below to reset your password.
{{link}}

p.s. It expires in 6 hours.

- Yac Meet`;

export const buildForgotPasswordMessage = (vars) => {
  return buildMessageTemplate({
    subjectTemplate: forgotPasswordSubjectTemplate,
    messageTemplate: forgotPasswordMessageTemplate,
    vars,
  });
};
