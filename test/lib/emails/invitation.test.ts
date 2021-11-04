import { expect, it } from "@jest/globals";

import { html, text, Invitation } from "@lib/emails/invitation";

import { getTranslation } from "@server/lib/i18n";

it("email text rendering should strip tags and add new lines", () => {
  const result = text("<p>hello world</p><br /><div>welcome to the brave <span>new</span> world");
  expect(result).toEqual("hello world\nwelcome to the brave new world");
});

it("email html should render invite email", async () => {
  const t = await getTranslation("en", "common");
  const invitation = {
    language: t,
    from: "Huxley",
    toEmail: "hello@example.com",
    teamName: "Calendar Lovers",
    token: "invite-token",
  } as Invitation;
  const result = html(invitation);
  expect(result).toContain(
    `<br />${t("user_invited_you", { user: invitation.from, teamName: invitation.teamName })}<br />`
  );
  expect(result).toContain("/auth/signup?token=invite-token&");
  expect(result).toContain(`${t("request_another_invitation_email", { toEmail: invitation.toEmail })}`);
});
