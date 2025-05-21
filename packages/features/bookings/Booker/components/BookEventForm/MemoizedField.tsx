import { memo } from "react";

import { FormBuilderField } from "@calcom/features/form-builder/FormBuilderField";

// This component wraps FormBuilderField with React.memo to prevent
// unnecessary re-renders when parent components change but the props
// to this component haven't changed
export const MemoizedField = memo(FormBuilderField);
