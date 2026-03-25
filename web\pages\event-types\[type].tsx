/**
 * Add optionalGuests to the FormValues type
 * Find the FormValues type definition and add:
 */

type OptionalGuest = {
  id: number;
  name: string | null;
  email: string;
  avatar?: string | null;
  username?: string | null;
};

// In the existing FormValues type, add:
export type FormValues = {
  // ... existing fields ...
  optionalGuests: OptionalGuest[];
  // ... rest of fields ...
};
