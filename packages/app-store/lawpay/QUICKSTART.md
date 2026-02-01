# LawPay Integration - Quick Start Guide

Get up and running with LawPay payments in Cal.com in under 5 minutes!

## 🚀 For Attorneys (End Users)

### Step 1: Prerequisites
- ✅ Active LawPay account ([Sign up here](https://lawpay.com))
- ✅ Cal.com account
- ✅ At least one event type created

### Step 2: Install LawPay App
1. Go to Cal.com App Store
2. Search for "LawPay"
3. Click "Install"

### Step 3: Connect Your Account
1. Click "Connect LawPay"
2. Log in to your LawPay account
3. Authorize Cal.com to access your account
4. You'll be redirected back to Cal.com

### Step 4: Configure Payment
1. Go to your Event Type settings
2. Scroll to "Apps" section
3. Find LawPay and click "Configure"
4. Set your payment details:
   - **Price**: Enter amount (e.g., 250.00)
   - **Currency**: Select USD, EUR, GBP, or CAD
   - **Account Type**: Choose Operating or Trust
   - **Payment Timing**: On Booking (default)
5. Click "Save"

### Step 5: Test It Out!
1. Share your booking link with a test client
2. Complete a test booking
3. Verify payment appears in your LawPay dashboard

**That's it! You're ready to accept payments! 🎉**

---

## 💻 For Developers

### Step 1: Get LawPay Credentials
1. Sign up at [LawPay Developer Portal](https://developers.8am.com)
2. Create a new application
3. Copy your credentials:
   - Client ID
   - Client Secret
   - Public Key

### Step 2: Configure Environment
```bash
# Add to your .env file
LAWPAY_CLIENT_ID=your_client_id_here
LAWPAY_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_LAWPAY_PUBLIC_KEY=your_public_key_here

# Optional: Use sandbox for testing
LAWPAY_API_URL=https://sandbox-api.lawpay.com
```

### Step 3: Install Dependencies
```bash
pnpm install
```

### Step 4: Run Development Server
```bash
pnpm dev
```

### Step 5: Test the Integration
```bash
# Run tests
pnpm test packages/app-store/lawpay

# Test OAuth flow
# 1. Navigate to http://localhost:3000/apps/lawpay
# 2. Click "Connect LawPay"
# 3. Complete OAuth flow

# Test payment creation
# 1. Create an event type
# 2. Enable LawPay payment
# 3. Create a test booking
```

---

## 🔧 Common Setup Issues

### Issue: "LawPay credentials not found"
**Solution**: Verify environment variables are set correctly
```bash
echo $LAWPAY_CLIENT_ID
echo $LAWPAY_CLIENT_SECRET
echo $NEXT_PUBLIC_LAWPAY_PUBLIC_KEY
```

### Issue: OAuth redirect fails
**Solution**: Check redirect URI in LawPay dashboard matches:
```
http://localhost:3000/api/integrations/lawpay/callback  # Development
https://yourdomain.com/api/integrations/lawpay/callback  # Production
```

### Issue: Payment not processing
**Solution**: 
1. Check LawPay account is active
2. Verify API credentials are correct
3. Check browser console for errors
4. Review server logs

### Issue: Trust account not available
**Solution**: Contact LawPay support to enable trust account features on your account

---

## 📚 Next Steps

### For Attorneys
- [ ] Set up multiple event types with different prices
- [ ] Configure trust vs operating accounts appropriately
- [ ] Test refund process
- [ ] Review LawPay dashboard for payment reports
- [ ] Set up trust accounting reports

### For Developers
- [ ] Read [CONTRIBUTING.md](./CONTRIBUTING.md)
- [ ] Review [README.md](./README.md) for detailed docs
- [ ] Explore the codebase
- [ ] Run the test suite
- [ ] Try implementing a new feature

---

## 🎯 Key Concepts

### Operating vs Trust Accounts

**Operating Account** 💼
- For general business payments
- Retainers, flat fees, hourly billing
- No special compliance requirements
- Immediate access to funds

**Trust Account** ⚖️
- For client funds held in trust
- IOLTA compliant
- Prevents comingling of funds
- Required for certain legal payments

### When to Use Each

| Payment Type | Account Type |
|--------------|--------------|
| Consultation fee | Operating |
| Retainer (earned) | Operating |
| Retainer (unearned) | Trust |
| Settlement funds | Trust |
| Client costs | Trust |
| Legal fees (billed) | Operating |

---

## 🔐 Security Best Practices

### For Production
1. ✅ Use environment variables (never commit credentials)
2. ✅ Enable webhook signature verification
3. ✅ Use HTTPS for all endpoints
4. ✅ Regularly rotate API keys
5. ✅ Monitor for suspicious activity
6. ✅ Keep dependencies updated

### For Development
1. ✅ Use sandbox environment
2. ✅ Never use production credentials locally
3. ✅ Don't commit .env files
4. ✅ Use test credit cards only
5. ✅ Clear test data regularly

---

## 📞 Getting Help

### Quick Links
- 📖 [Full Documentation](./README.md)
- 🐛 [Report Issues](https://github.com/calcom/cal.com/issues)
- 💬 [Cal.com Discord](https://cal.com/discord)
- 📧 [Email Support](mailto:support@cal.com)

### LawPay Support
- 🌐 [Help Center](https://help.lawpay.com)
- 👨‍💻 [Developer Portal](https://developers.8am.com)
- 📞 Phone: Check LawPay website

---

## ✅ Checklist

### Before Going Live
- [ ] LawPay account verified and approved
- [ ] Production API credentials configured
- [ ] Webhook endpoint configured
- [ ] SSL certificate installed
- [ ] Test payment completed successfully
- [ ] Refund process tested
- [ ] Trust accounting verified (if applicable)
- [ ] Support documentation reviewed
- [ ] Team trained on payment process

---

## 🎉 Success!

You're now ready to accept payments through LawPay!

**Need more help?** Check out the [full documentation](./README.md) or reach out to support.

---

**Last Updated**: January 2024  
**Version**: 1.0.0
