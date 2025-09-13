// Booking data structure for the slide-over
export interface BookingData {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: "confirmed" | "cancelled" | "pending" | "completed";
  attendees: {
    name: string;
    email: string;
    role: "host" | "guest";
  }[];
  // Add more fields as needed
}

// Props passed to each tab component
export interface BookingTabProps {
  booking: BookingData;
  onBookingUpdate?: (booking: BookingData) => void;
}

// Tab configuration interface
export interface BookingTab {
  id: string;
  label: string;
  icon?: string;
  component: React.ComponentType<BookingTabProps>;
  disabled?: boolean;
}

// Main slide-over component props
export interface BookingSlideOverProps {
  activeTab?: BookingTabId; // Tab ID to open (undefined = closed)
  onActiveTabChange: (activeTab?: BookingTabId) => void;
  booking: BookingData;
  availableTabs?: string[]; // Which tabs to show (if not provided, shows all)
  onBookingUpdate?: (booking: BookingData) => void;
}

// Available tab IDs (for type safety)
export type BookingTabId = "details" | "edit" | "audit" | "notes";
