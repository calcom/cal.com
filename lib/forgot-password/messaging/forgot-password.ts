import { TFunction } from "next-i18next";

import { buildMessageTemplate, VarType } from "../../emails/buildMessageTemplate";

export const forgotPasswordSubjectTemplate = (t: TFunction): string => {
  const text = t("forgot_your_password_calcom");
  return text;
};

export const forgotPasswordMessageTemplate = (t: TFunction): string => {
  const text = `${t("hey_there")}

  ${t("use_link_to_reset_password")}
  {{link}}

  ${t("link_expires", { expiresIn: 6 })}

  - Cal.com`;
  return text;
};

export const buildForgotPasswordMessage = (vars: VarType) => {
  return buildMessageTemplate({
    subjectTemplate: forgotPasswordSubjectTemplate(vars.language),
    messageTemplate: forgotPasswordMessageTemplate(vars.language),
    vars,
  });
};

export const forgotIdentityProverMessage = `Hey there,

You use {{identityProvider}} to log into Cal. Click the "Log in with {{identityProvider}}" button on the login page to access your account.

- Cal.com`;

export const buildForgotIdentityProviderMessage = (vars) => {
  return buildMessageTemplate({
    subjectTemplate: forgotPasswordSubjectTemplate(vars.language),
    messageTemplate: forgotIdentityProverMessage,
    vars,
  });
};
