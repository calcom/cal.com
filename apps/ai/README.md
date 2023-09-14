# Cal.com Email Assistant

Welcome to the first stage of Cal AI!

This app lets you chat with your calendar via email:

  - Turn informal emails into bookings eg. forward "wanna meet tmrw at 2pm?"
  - List and rearrange your bookings eg. "Cancel my next meeting"
  - Answer basic questions about your busiest times eg. "How does my Tuesday look?"

The core logic is contained in [agent/route.ts](/apps/ai/src/app/api/agent/route.ts). Here, a [LangChain Agent Executor](https://docs.langchain.com/docs/components/agents/agent-executor) is tasked with following your instructions. Given your last-known timezone, working hours, and busy times, it attempts to CRUD your bookings.

_The AI agent can only choose from a set of tools, without ever seeing your API key._

Emails are cleaned and routed in [receive/route.ts](/apps/ai/src/app/api/receive/route.ts) using [MailParser](https://nodemailer.com/extras/mailparser/).

Incoming emails are routed by email address. Addresses are verified by [DKIM record](https://support.google.com/a/answer/174124?hl=en), making it hard to spoof them.

## Getting Started

### Development

If you haven't yet, please run the [root setup](/README.md) steps.

Before running the app, please see [env.mjs](./src/env.mjs) for all required environment variables. You'll need:

  - An [OpenAI API key](https://platform.openai.com/account/api-keys) with access to GPT-4
  - A [SendGrid API key](https://app.sendgrid.com/settings/api_keys)
  - A default sender email (for example, `ai@cal.dev`)
  - The Cal AI's app ID and URL (see [add.ts](/packages/app-store/cal-ai/api/index.ts))

To stand up the API and AI apps simultaneously, simply run `yarn dev:ai`.

### Email Router

To expose the AI app, run `ngrok http 3000` (or the AI app's port number) in a new terminal. You may need to install [nGrok](https://ngrok.com/).

To forward incoming emails to the Node.js server, one option is to use [SendGrid's Inbound Parse Webhook](https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook).

1.  [Sign up for an account](https://signup.sendgrid.com/)
2.  Go to Settings > [Inbound Parse](https://app.sendgrid.com/settings/parse) > Add Host & URL.
3.  For subdomain, use `<sub>.<domain>.com` for now, where `sub` can be any subdomain but `domain.com` will need to be verified via MX records in your environment variables, eg. on [Vercel](https://vercel.com/guides/how-to-add-vercel-environment-variables).
4.  Use the nGrok URL from above as the **Destination URL**.
5.  Activate "POST the raw, full MIME message".
6.  Send an email to `<anyone>@ai.example.com`. You should see a ping on the nGrok listener and Node.js server.
7.  Adjust the logic in [receive/route.ts](/apps/ai/src/app/api/receive/route.ts), save to hot-reload, and send another email to test the behaviour.

Please feel free to improve any part of this architecture.
