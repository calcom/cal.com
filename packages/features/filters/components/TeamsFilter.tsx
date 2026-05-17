"use client";

import type { ReactNode } from "react";

interface FilterCheckboxFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: ReactNode;
  testId?: string;
}

export function FilterCheckboxField({ id, label, checked, onChange, icon, testId }: FilterCheckboxFieldProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2" data-testid={testId}>
      {icon}
      <input type="checkbox" id={id} checked={checked} onChange={onChange} className="h-4 w-4" />
      <label htmlFor={id} className="text-sm cursor-pointer">
        {label}
      </label>
    </div>
  );
}

export function FilterCheckboxFieldsContainer({ children }: { children: ReactNode }) {
  return <div className="flex flex-col">{children}</div>;
}
