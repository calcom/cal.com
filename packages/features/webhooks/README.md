# Cal.com Webhooks

This package contains the webhook functionality for Cal.com.

## Security

Webhook secrets are sent via the `x-cal-webhook-secret` header when triggering webhooks, rather than in the payload body. This provides improved security by:

1. Keeping the secret out of request logs
2. Making it easier to validate the secret on the receiving end
3. Following standard security practices for webhook implementations

The webhook signature is still sent in the `X-Cal-Signature-256` header for verification purposes.
