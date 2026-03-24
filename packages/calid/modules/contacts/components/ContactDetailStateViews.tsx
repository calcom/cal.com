import { Button } from "@calid/features/ui/components/button";
import { Loader2 } from "lucide-react";

interface ContactDetailInvalidStateProps {
  onBack: () => void;
}

export const ContactDetailInvalidState = ({ onBack }: ContactDetailInvalidStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h3 className="mb-1 text-lg font-semibold">Invalid contact</h3>
      <p className="text-muted-foreground mb-4 text-sm">The contact ID is invalid.</p>
      <Button color="secondary" onClick={onBack}>
        Back to Contacts
      </Button>
    </div>
  );
};

export const ContactDetailLoadingState = () => {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
    </div>
  );
};

interface ContactDetailNotFoundStateProps {
  onBack: () => void;
}

export const ContactDetailNotFoundState = ({ onBack }: ContactDetailNotFoundStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h3 className="mb-1 text-lg font-semibold">Contact not found</h3>
      <p className="text-muted-foreground mb-4 text-sm">This contact may have been removed.</p>
      <Button color="secondary" onClick={onBack}>
        Back to Contacts
      </Button>
    </div>
  );
};

interface ContactDetailErrorStateProps {
  message: string;
  onRetry: () => void;
}

export const ContactDetailErrorState = ({ message, onRetry }: ContactDetailErrorStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h3 className="mb-1 text-lg font-semibold">Failed to load contact</h3>
      <p className="text-muted-foreground mb-4 text-sm">{message || "Please try again in a moment."}</p>
      <Button color="secondary" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
};
