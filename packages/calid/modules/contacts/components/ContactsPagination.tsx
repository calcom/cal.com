import { Button } from "@calid/features/ui/components/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ContactsPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (nextPage: number) => void;
}

export const ContactsPagination = ({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: ContactsPaginationProps) => {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between pt-2">
      <span className="text-muted-foreground text-xs">
        {totalItems} contact{totalItems !== 1 ? "s" : ""} - Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <Button
          color="secondary"
          variant="icon"
          size="sm"
          className="h-8 w-8"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          color="secondary"
          variant="icon"
          size="sm"
          className="h-8 w-8"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
