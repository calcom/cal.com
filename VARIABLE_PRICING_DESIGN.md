# Variable Pricing Feature Design

## Overview
This document outlines the design for implementing variable pricing in Cal.com, allowing event types to have different prices based on:
- Duration/length of the booking slot
- Time of day (e.g., evening/weekend surcharge)
- Custom rules and conditions

## Database Schema Changes

### Option 1: JSON-based approach (Recommended)
Extend the existing `EventType.metadata` field to include a `variablePricing` object:

```json
{
  "apps": {
    "stripe": {
      "enabled": true,
      "price": 5000, // Base price in cents (deprecated, kept for backwards compatibility)
      "currency": "usd",
      "variablePricing": {
        "enabled": true,
        "basePrice": 5000, // Default/base price in cents
        "currency": "usd",
        "rules": [
          {
            "id": "rule-1",
            "type": "duration", // "duration", "timeOfDay", "dayOfWeek", "custom"
            "condition": {
              "minDuration": 30,
              "maxDuration": 60
            },
            "price": 5000,
            "description": "30-60 minute sessions"
          },
          {
            "id": "rule-2", 
            "type": "duration",
            "condition": {
              "minDuration": 61,
              "maxDuration": 120
            },
            "price": 8000,
            "description": "1-2 hour sessions"
          },
          {
            "id": "rule-3",
            "type": "timeOfDay",
            "condition": {
              "startTime": "18:00",
              "endTime": "23:59"
            },
            "priceModifier": {
              "type": "surcharge", // "surcharge", "discount", "absolute"
              "value": 2000 // +$20 after 6pm
            },
            "description": "Evening surcharge"
          },
          {
            "id": "rule-4",
            "type": "dayOfWeek", 
            "condition": {
              "days": ["saturday", "sunday"]
            },
            "priceModifier": {
              "type": "surcharge",
              "value": 1500 // +$15 on weekends
            },
            "description": "Weekend surcharge"
          }
        ]
      }
    }
  }
}
```

### Option 2: Separate table approach (If JSON becomes limiting)
```sql
-- Create dedicated pricing rules table
CREATE TABLE EventTypePricingRule (
  id SERIAL PRIMARY KEY,
  eventTypeId INTEGER NOT NULL REFERENCES EventType(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- 'duration', 'timeOfDay', 'dayOfWeek', 'custom'
  conditions JSON NOT NULL, -- Store rule conditions
  price INTEGER, -- Absolute price in cents
  priceModifier JSON, -- For surcharges/discounts: {type: 'surcharge', value: 1000}
  enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- For rule ordering
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_event_type_pricing_rules ON EventTypePricingRule(eventTypeId, enabled);
```

## API Changes

### 1. Backend tRPC Routes
- `eventTypes.getPricingRules` - Get pricing rules for an event type
- `eventTypes.updatePricingRules` - Update pricing rules
- `eventTypes.calculatePrice` - Calculate price for a specific booking slot

### 2. Booking Flow Updates
- Update booking creation to calculate correct price based on rules
- Modify Stripe integration to create payment with calculated price
- Add price breakdown in booking confirmation

## Frontend Changes

### 1. Event Type Settings UI
- Add "Variable Pricing" section to event type configuration
- Pricing rules builder interface
- Preview/test pricing calculator

### 2. Booking Page Updates
- Show dynamic pricing based on selected slot
- Display price breakdown if multiple rules apply
- Update price in real-time as user changes slot

### 3. Admin/Analytics
- Pricing rules management interface
- Revenue analytics by pricing rule

## Stripe Integration Changes

### 1. Dynamic Price Creation
- Create Stripe prices on-demand for variable pricing
- Cache commonly used price configurations
- Handle price updates and synchronization

### 2. Payment Processing
- Update payment creation to use calculated price
- Store pricing rule information in payment metadata
- Handle refunds with variable pricing considerations

## Implementation Phases

### Phase 1: Core Backend Infrastructure
1. Database schema updates (JSON-based approach)
2. Pricing calculation engine
3. Basic API endpoints

### Phase 2: Frontend UI
1. Event type pricing rules editor
2. Booking page price display updates
3. Admin interfaces

### Phase 3: Stripe Integration
1. Dynamic Stripe price creation
2. Payment processing updates
3. Webhook handling for variable pricing

### Phase 4: Advanced Features
1. Rule templates and presets
2. Analytics and reporting
3. Advanced rule conditions
4. Bulk pricing operations

## Pricing Calculation Logic

```typescript
interface PricingContext {
  duration: number; // in minutes
  startTime: Date;
  endTime: Date;
  timezone: string;
  eventTypeId: number;
}

function calculatePrice(context: PricingContext, rules: PricingRule[]): {
  basePrice: number;
  modifiers: PriceModifier[];
  totalPrice: number;
  breakdown: PriceBreakdown[];
} {
  // 1. Start with base price
  // 2. Find applicable duration-based rules
  // 3. Apply time-based modifiers (surcharges/discounts)
  // 4. Apply day-of-week modifiers
  // 5. Apply custom rules
  // 6. Return detailed breakdown
}
```

## Backwards Compatibility

- Keep existing `price` and `currency` fields for simple pricing
- Gracefully fall back to simple pricing if variable pricing is disabled
- Migrate existing events to use variable pricing structure

## Testing Strategy

1. Unit tests for pricing calculation engine
2. Integration tests for API endpoints
3. E2E tests for booking flow with variable pricing
4. Stripe integration testing with test mode
5. Performance testing for pricing calculations

## Security Considerations

- Validate all pricing rules on server-side
- Prevent price manipulation on client-side
- Audit log for pricing changes
- Rate limiting for pricing calculation APIs

## Migration Plan

1. Add new fields to existing events (non-breaking)
2. Update APIs to support both old and new pricing
3. Gradually migrate existing integrations
4. Eventually deprecate old pricing fields