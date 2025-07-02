import { useState, useCallback } from "react";

interface BookingFormState {
  rejectionReason: string;
  selectedEmail: string;
  noShowAttendees: any[];
}

interface BookingFormActions {
  setRejectionReason: (reason: string) => void;
  setSelectedEmail: (email: string) => void;
  setNoShowAttendees: (attendees: any[]) => void;
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

  const setNoShowAttendees = useCallback((attendees: any[]) => {
    setFormState((prev) => ({ ...prev, noShowAttendees: attendees }));
  }, []);

  const resetFormState = useCallback(() => {
    setFormState(initialState);
  }, []);

  return [
    formState,
    {
      setRejectionReason,
      setSelectedEmail,
      setNoShowAttendees,
      resetFormState,
    },
  ];
}
