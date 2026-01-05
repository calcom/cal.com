# A/B Testing Experiments

This package provides infrastructure for running A/B tests (experiments) in Cal.com.

## Features

- **Variant Assignment**: Deterministic (hash-based) or random assignment
- **User & Team Scoping**: Experiments can target individual users or teams
- **Automatic Tracking**: Exposure and conversion events tracked to PostHog
- **Admin UI**: Configure experiments, view stats, and manage lifecycles
- **Migration**: Conclude experiments and migrate all users to winning variant

## Quick Start

### 1. Create an Experiment

Use the admin UI at `/settings/admin/flags` or the playground at `/settings/admin/playground/experiments`:

```typescript
// Via tRPC mutation
await trpc.viewer.admin.updateExperimentConfig.mutate({
  slug: "new-cta-button",
  metadata: {
    variants: [
      { name: "control", percentage: 50 },
      { name: "treatment", percentage: 50 },
    ],
    assignmentType: "DETERMINISTIC",
    status: "running",
  },
});
```

### 2. Use in Your Code

```typescript
import { useExperiment, trackExperimentConversion } from "@calcom/features/experiments";

function BookingButton() {
  const session = useSession();
  const { variant, isLoading, assignmentType } = useExperiment("new-cta-button", {
    userId: session.data?.user.id,
  });

  const handleBooking = async () => {
    // ... booking logic ...
    
    // track conversion
    if (variant && assignmentType) {
      trackExperimentConversion("new-cta-button", variant, assignmentType, {
        conversionEvent: "booking_created",
        userId: session.data?.user.id,
      });
    }
  };

  if (isLoading) return <Skeleton />;

  return (
    <Button 
      color={variant === "control" ? "secondary" : "primary"}
      onClick={handleBooking}
    >
      {variant === "control" ? "Book Now" : "🚀 Book Your Slot!"}
    </Button>
  );
}
```

### 3. Analyze in PostHog

Events are tracked to PostHog:
- `experiment_viewed`: When a user is exposed to an experiment
- `experiment_conversion`: When a user completes the target action

Use PostHog's experimentation features to analyze statistical significance.

### 4. Conclude & Migrate

Once you have a winner:
1. Set experiment status to "concluded" in admin UI
2. Set the winner variant
3. Click "Migrate All Users" to update all existing assignments

## Experiment Lifecycle

1. **Draft**: Experiment is being configured, no assignments made
2. **Running**: Active experiment, users are being assigned variants
3. **Paused**: Temporarily paused, existing assignments remain but no new ones
4. **Concluded**: Experiment complete, all users get winner variant (if set)

## Assignment Types

### Deterministic (Recommended)
- Uses hash of userId/teamId + experiment slug
- Same user always gets same variant
- Best for consistent user experience

### Random
- Random assignment on each request
- Useful for testing assignment logic
- Not recommended for production

## Testing

Use the admin playground at `/settings/admin/playground/experiments` to:
- Create test experiments
- Test variant assignments
- Simulate different user IDs
- Track test conversions
- View real-time stats

## API Reference

### `useExperiment(slug, options)`

React hook for getting variant assignment.

**Options:**
- `userId?: number` - User to assign variant to
- `teamId?: number` - Team to assign variant to
- `skip?: boolean` - Skip the query

**Returns:**
- `variant: string | null` - Assigned variant name
- `isLoading: boolean` - Loading state
- `isError: boolean` - Error state
- `isControl: boolean` - True if variant is "control"
- `isNewAssignment: boolean` - True if this is a new assignment
- `assignmentType: ExperimentAssignmentType | null` - Assignment type used

### `trackExperimentConversion(slug, variant, assignmentType, metadata)`

Track a conversion event for an experiment.

**Parameters:**
- `slug: string` - Experiment slug
- `variant: string` - Variant name
- `assignmentType: ExperimentAssignmentType` - Assignment type
- `metadata?: object` - Additional metadata to track

## Database Schema

Experiments are stored in the `Feature` table with `type = "EXPERIMENT"`:

```prisma
model Feature {
  slug        String       @id
  type        FeatureType  // "EXPERIMENT"
  enabled     Boolean
  metadata    Json         // ExperimentMetadata
  ...
}

model ExperimentVariant {
  id             String
  experimentSlug String
  variant        String
  userId         Int?
  teamId         Int?
  assignmentType ExperimentAssignmentType
  assignedAt     DateTime
  ...
}
```

## Best Practices

1. **Start Small**: Begin with 50/50 splits before optimizing
2. **Single Metric**: Focus on one primary conversion metric
3. **Run Long Enough**: Ensure statistical significance before concluding
4. **Consistent UX**: Use deterministic assignment for user-facing features
5. **Clean Up**: Conclude experiments and remove experiment code after migration
