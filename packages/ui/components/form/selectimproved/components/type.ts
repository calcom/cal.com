export interface Option {
  value?: string;
  label: string;
  disabled?: boolean;
  isSelected?: boolean;
  options?: Option[];
}

export interface ClassNames {
  menuButton?: ({ isDisabled }: { isDisabled: boolean }) => string;
  menu?: string;
  tagItem?: ({ isDisabled }: { isDisabled: boolean }) => string;
  tagItemText?: string;
  tagItemIconContainer?: string;
  tagItemIcon?: string;
  list?: string;
  listGroupLabel?: string;
  listItem?: ({ isSelected }: { isSelected: boolean }) => string;
  listDisabledItem?: string;
  ChevronIcon?: ({ open }: { open: boolean }) => string;
  searchContainer?: string;
  searchBox?: string;
  searchIcon?: string;
  closeIcon?: string;
}
