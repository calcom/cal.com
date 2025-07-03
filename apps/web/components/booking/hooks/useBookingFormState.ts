import { useState, useCallback, useMemo } from "react";

// Define proper type for attendees instead of using any[]
interface BookingAttendee {
  id: number;
  email: string;
  name?: string;
  noShow: boolean;
}

interface BookingFormState {
  rejectionReason: string;
  selectedEmail: string;
  noShowAttendees: BookingAttendee[];
}

interface BookingFormActions {
  setRejectionReason: (reason: string) => void;
  setSelectedEmail: (email: string) => void;
  setNoShowAttendees: (attendees: BookingAttendee[]) => void;
  resetFormState: () => void;
}

const initialState: BookingFormState = {
  rejectionReason: "",
  selectedEmail: "",
  noShowAttendees: [],
};

export function useBookingFormState(): [BookingFormState, BookingFormActions] {
  const [formState, setFormState] = useState<BookingFormState>(initialState);

  const setRejectionReason = useCallback((reason: string) => {
    setFormState((prev) => ({ ...prev, rejectionReason: reason }));
  }, []);

  const setSelectedEmail = useCallback((email: string) => {
    setFormState((prev) => ({ ...prev, selectedEmail: email }));
  }, []);

  const setNoShowAttendees = useCallback((attendees: BookingAttendee[]) => {
    setFormState((prev) => ({ ...prev, noShowAttendees: attendees }));
  }, []);

  const resetFormState = useCallback(() => {
    setFormState(initialState);
  }, []);

  // Wrap actions object in useMemo to ensure stable reference and prevent unnecessary re-renders
  const actions = useMemo(
    () => ({
      setRejectionReason,
      setSelectedEmail,
      setNoShowAttendees,
      resetFormState,
    }),
    [setRejectionReason, setSelectedEmail, setNoShowAttendees, resetFormState]
  );

  return [formState, actions];
}
