// Remove undefined actions from zapierActions registry
import { noShowAction } from "./noShow";
// Import other required actions
import { bookingCreatedAction } from "./bookingCreated";
// ... other imports

const zapierActions = [
  noShowAction,
  bookingCreatedAction,
  // ... other actions
];
