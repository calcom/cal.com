import { memo } from "react";

import { FormBuilderField } from "@calcom/features/form-builder/FormBuilderField";

// Component for individual field items, separated to prevent re-renders
const BookingFieldItem = ({
  field,
  readOnly,
  hidden,
  className,
}: {
  field: any;
  readOnly: boolean;
  hidden: boolean;
  className?: string;
}) => {
  // Pass the field with hidden property to FormBuilderField
  return <FormBuilderField className={className || ""} field={{ ...field, hidden }} readOnly={readOnly} />;
};

// Memo to prevent re-renders when parent re-renders
export default memo(BookingFieldItem);
