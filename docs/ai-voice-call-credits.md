# AI Voice Call Credits

## Overview

This document describes the credit system for AI voice calls in Cal.com. The system charges users 1 credit per minute for completed AI voice calls, with a **minimum requirement of 5 credits** to initiate any phone call.

## Credit Requirements

- **Minimum Credits**: Users must have at least 5 credits available to initiate a phone call
- **Billing Rate**: 1 credit per minute of call duration (rounded up)
- **Credit Check**: The system performs credit validation both on the frontend and backend before allowing calls

## How It Works

### Credit Validation

1. **Frontend Check**: Before initiating a call, the UI validates that the user has at least 5 credits
2. **Backend Check**: The API endpoint `makeSelfServePhoneCall` validates credits before processing the call
3. **Real-time Charging**: Once calls complete, credits are charged via the Retell AI webhook

### Credit Calculation Examples

- **30 seconds**: 1 credit (rounded up)
- **1 minute**: 1 credit
- **1 minute 30 seconds**: 2 credits (rounded up)
- **2 minutes**: 2 credits
- **2 minutes 30 seconds**: 3 credits (rounded up)

## Integration with Retell AI

The credit system integrates with Retell AI webhooks to charge credits based on actual call duration:

### Setup Instructions

1. **Configure Retell AI Webhook**
   - Go to your [Retell AI Dashboard](https://dashboard.retellai.com)
   - Navigate to **Settings** → **Webhooks**
   - Add a new webhook with URL: `https://yourdomain.com/api/webhooks/retell-ai`
   - Enable events: `call_ended`

2. **Environment Configuration**
   - Valid Retell AI API credentials
   - Credit system enabled (`IS_SMS_CREDITS_ENABLED=true`)
   - Database properly configured with credit tables

### Credit Deduction Logic

1. **Pre-call Validation**: Ensures user has at least 5 credits before call initiation
2. **Call Processing**: Retell AI handles the actual phone call
3. **Post-call Charging**: Webhook charges credits based on actual duration
4. **Audit Logging**: Records all transactions for accountability

### Excluded Calls

The system will **NOT** charge credits for:
- Calls with missing timestamps
- Calls that were cancelled before completion
- Calls that ended due to errors
- Calls with zero or negative duration

## Webhook Events

### `call_started`
- **Action**: Logs call initiation
- **Billing**: No charges applied

### `call_ended`
- **Action**: Calculates duration and charges credits
- **Billing**: 1 credit per minute (rounded up)

### `call_analyzed`
- **Action**: Logs call analysis completion
- **Billing**: No charges applied

## Error Handling

### Common Scenarios

1. **Insufficient Credits (Pre-call)**: Error shown to user, call prevented
2. **User Not Found**: Logs error, no charges applied
3. **Invalid Duration**: Logs warning, no charges applied
4. **Database Errors**: Logs error, webhook returns 500 status

### User Experience

- **Frontend**: Shows detailed error messages about credit requirements
- **Backend**: Validates credits before processing calls
- **Billing**: Only charges for successfully completed calls

## Integration with Existing Credit System

This system leverages the existing SMS credit infrastructure:

- **Credit Service**: Uses `CreditService.chargeCredits()` 
- **Database**: Stores in existing `CreditExpenseLog` table
- **Billing**: Integrates with existing billing and subscription logic
- **Notifications**: Supports low credit warnings and limits

## Monitoring and Debugging

### Logs to Monitor

```javascript
// Successful credit charge
"Successfully charged X credits for user Y, call Z (N minutes)"

// Insufficient credits (pre-call)
"User X has insufficient credits for call Y (5 credits needed)"

// Invalid call data
"Call X missing timestamps, skipping credit deduction"
```

### Health Checks

1. **Webhook Status**: Monitor webhook delivery in Retell AI dashboard
2. **Credit Balance**: Check user credit balances regularly
3. **Expense Logs**: Review `CreditExpenseLog` table for accuracy
4. **Error Rates**: Monitor webhook error responses

## API Reference

### Webhook Endpoint

```
POST /api/webhooks/retell-ai
```

### Expected Payload

```json
{
  "event": "call_ended",
  "call": {
    "call_id": "call_123",
    "from_number": "+1234567890",
    "to_number": "+0987654321",
    "start_timestamp": 1640995200000,
    "end_timestamp": 1640995320000,
    "disconnection_reason": "user_hung_up"
  }
}
```

### Response

```json
{
  "success": true,
  "message": "Processed call_ended for call call_123"
}
```

## Troubleshooting

### Webhook Not Receiving Events

1. Verify webhook URL is correct and accessible
2. Check Retell AI dashboard for webhook delivery status
3. Ensure your server is running and responding
4. Check firewall/security settings

### Credits Not Being Charged

1. Check user has sufficient credits
2. Verify phone number is associated with a user
3. Review logs for error messages
4. Check call duration calculations

### User Cannot Make Calls

1. Verify user has at least 5 credits
2. Check credit calculation (monthly + additional credits)
3. Review error messages in UI
4. Check backend validation logs

## Security Considerations

- **Webhook Authentication**: Consider adding signature verification
- **Rate Limiting**: Implement rate limiting on webhook endpoint
- **Input Validation**: All payloads are validated with Zod schemas
- **Error Handling**: Sensitive data is not exposed in error responses

## Future Enhancements

- **Webhook Signature Verification**: Add Retell AI signature validation
- **Credit Thresholds**: Different rates for different call types
- **Usage Analytics**: Dashboard for call usage and costs
- **Real-time Notifications**: Alert users when credits are low during calls
