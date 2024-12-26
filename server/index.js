const express = require('express');
const app = express();
const refundPoliciesRoute = require('./routes/refundPolicies');
const { refundPolicies } = require('../config/paymentPolicies');
const { performance } = require('perf_hooks');

// ... other middleware and routes ...

app.use('/api', refundPoliciesRoute);

// Add a new endpoint to serve refund policies
app.get('/api/refund-policies', (req, res) => {
    res.json(refundPolicies);
});

// ... server setup ... 