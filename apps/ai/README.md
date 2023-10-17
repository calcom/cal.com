# Cal.ai

Welcome to [Cal.ai](https://cal.ai)!

This app lets you chat with your calendar via email:

- Turn informal emails into bookings eg. forward "wanna meet tmrw at 2pm?"
- List and rearrange your bookings eg. "clear my afternoon"
- Answer basic questions about your busiest times eg. "how does my Tuesday look?"

The core logic is contained in [agent/route.ts](/apps/ai/src/app/api/agent/route.ts). Here, a [LangChain Agent Executor](https://docs.langchain.com/docs/components/agents/agent-executor) is tasked with following your instructions. Given your last-known timezone, working hours, and busy times, it attempts to CRUD your bookings.

_The AI agent can only choose from a set of tools, without ever seeing your API key._

Emails are cleaned and routed in [receive/route.ts](/apps/ai/src/app/api/receive/route.ts) using [MailParser](https://nodemailer.com/extras/mailparser/).

Incoming emails are routed by email address. Addresses are verified by [DKIM record](https://support.google.com/a/answer/174124?hl=en), making them hard to spoof.

## Recognition

<a href="https://www.producthunt.com/posts/cal-ai?utm_source=badge-top-post-badge&utm_medium=badge&utm_souce=badge-cal&#0045;ai" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/top-post-badge.svg?post_id=419860&theme=light&period=daily" alt="Cal&#0046;ai - World&#0039;s&#0032;first&#0032;open&#0032;source&#0032;AI&#0032;scheduling&#0032;assistant | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a> <a href="https://www.producthunt.com/posts/cal-ai?utm_source=badge-featured&utm_medium=badge&utm_souce=badge-cal&#0045;ai" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=419860&theme=light" alt="Cal&#0046;ai - World&#0039;s&#0032;first&#0032;open&#0032;source&#0032;AI&#0032;scheduling&#0032;assistant | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>

## Getting Started

### Development

If you haven't yet, please run the [root setup](/README.md) steps.

Before running the app, please see [env.mjs](./src/env.mjs) for all required environment variables. Run `cp .env.example .env` in this folder to get started. You'll need:

- An [OpenAI API key](https://platform.openai.com/account/api-keys) with access to GPT-4
- A [SendGrid API key](https://app.sendgrid.com/settings/api_keys)
- A default sender email (for example, `me@dev.example.com`)
- The Cal.ai app's ID and URL (see [add.ts](/packages/app-store/cal-ai/api/index.ts))
- A unique value for `PARSE_KEY` with `openssl rand -hex 32`

To stand up the API and AI apps simultaneously, simply run `yarn dev:ai`.

### Agent Architecture

The scheduling agent in [agent/route.ts](/apps/ai/src/app/api/agent/route.ts) calls an LLM (in this case, GPT-4) in a loop to accomplish a multi-step task. We use an [OpenAI Functions agent](https://js.langchain.com/docs/modules/agents/agent_types/openai_functions_agent), which is fine-tuned to output text suited for passing to tools.

Tools (eg. [`createBooking`](/apps/ai/src/tools/createBooking.ts)) are simply JavaScript methods wrapped by Zod schemas, telling the agent what format to output.

Here is the full architecture:

![Cal.ai architecture](/apps/ai/src/public/architecture.png)

### Email Router

To expose the AI app, run `ngrok http 3005` (or the AI app's port number) in a new terminal. You may need to install [nGrok](https://ngrok.com/).

To forward incoming emails to the serverless function at `/agent`, we use [SendGrid's Inbound Parse](https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook).

1.  Ensure you have a [SendGrid account](https://signup.sendgrid.com/)
2.  Ensure you have an authenticated domain. Go to Settings > Sender Authentication > Authenticate. For DNS host, select `I'm not sure`. Click Next and add your domain, eg. `example.com`. Choose Manual Setup. You'll be given three CNAME records to add to your DNS settings, eg. in [Vercel Domains](https://vercel.com/dashboard/domains). After adding those records, click Verify. To troubleshoot, see the [full instructions](https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication).
3.  Authorize your domain for email with MX records: one with name `[your domain].com` and value `mx.sendgrid.net.`, and another with name `bounces.[your domain].com` and value `feedback-smtp.us-east-1.amazonses.com`, both with priority `10` if prompted.
4.  Go to Settings > [Inbound Parse](https://app.sendgrid.com/settings/parse) > Add Host & URL. Choose your authenticated domain.
5.  In the Destination URL field, use the nGrok URL from above along with the path, `/api/receive`, and one param, `parseKey`, which lives in [this app's .env](/apps/ai/.env.example) under `PARSE_KEY`. The full URL should look like `https://abc.ngrok.io/api/receive?parseKey=ABC-123`.
6.  Activate "POST the raw, full MIME message".
7.  Send an email to `[anyUsername]@example.com`. You should see a ping on the nGrok listener and server.
8.  Adjust the logic in [receive/route.ts](/apps/ai/src/app/api/receive/route.ts), save to hot-reload, and send another email to test the behaviour.

Please feel free to improve any part of this architecture!
