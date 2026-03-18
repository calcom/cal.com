import { useEffect, useState } from "react";

type UseContactDetailUiStateInput = {
  contactId?: number;
  initialNotes: string;
};

export const useContactDetailUiState = ({ contactId, initialNotes }: UseContactDetailUiStateInput) => {
  const [notes, setNotes] = useState(initialNotes);
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [notesErrorMessage, setNotesErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setNotes(initialNotes);
  }, [contactId, initialNotes]);

  const handleEditOpenChange = (open: boolean) => {
    setEditOpen(open);
    if (!open) {
      setEditErrorMessage(null);
    }
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    setNotesErrorMessage(null);
  };

  return {
    notes,
    setNotes,
    editOpen,
    setEditOpen,
    shareOpen,
    setShareOpen,
    scheduleOpen,
    setScheduleOpen,
    editErrorMessage,
    setEditErrorMessage,
    deleteErrorMessage,
    setDeleteErrorMessage,
    notesErrorMessage,
    setNotesErrorMessage,
    handleEditOpenChange,
    handleNotesChange,
  };
};
