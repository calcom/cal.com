---
title: Sendgrid
description: Set up SendGrid email integration for Cal.diy.
---

# Sendgrid

1. **Create a SendGrid account** - Go to [https://signup.sendgrid.com/](https://signup.sendgrid.com/) and create a new SendGrid account.

2. **Generate an API key** - Navigate to **Settings** -> **API Keys** and create a new API key.

3. **Add API key to .env** - Copy the generated API key and add it to your `.env` file under the field:

```
SENDGRID_API_KEY
```

4. **Verify a sender email** - Go to **Settings** -> **Sender Authentication** and verify a single sender.

5. **Add verified email to .env** - Copy the verified email address and add it to your `.env` file under the field:

```
SENDGRID_EMAIL
```

> This app is **required** for Workflows
