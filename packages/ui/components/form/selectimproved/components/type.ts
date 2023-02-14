export interface Option {
  value?: string;
  label: string;
  disabled?: boolean;
  isSelected?: boolean;
  options?: Option[];
  leftNode?: React.ReactNode;
}

export interface ClassNames {
  menuButton?: (args: { isDisabled: boolean }) => string;
  menu?: string;
  tagItem?: (args: { isDisabled: boolean }) => string;
  tagItemText?: string;
  tagItemIconContainer?: string;
  tagItemIcon?: string;
  list?: string;
  listGroupLabel?: string;
  listItem?: (args: { isSelected: boolean }) => string;
  listDisabledItem?: string;
  ChevronIcon?: (args: { open: boolean }) => string;
  searchContainer?: string;
  searchBox?: string;
  searchIcon?: string;
  closeIcon?: string;
}
