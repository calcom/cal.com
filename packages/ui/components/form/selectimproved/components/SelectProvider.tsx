import React, { createContext, useContext, useMemo } from "react";

import { ClassNames, Option } from "./type";

interface Store {
  selectedItems: Option | Option[] | null;
  handleValueChange: (selected: Option) => void;
  classNames?: ClassNames;
}

interface Props {
  selectedItems: Option | Option[] | null;
  handleValueChange: (selected: Option) => void;
  children: JSX.Element;
  options: {
    classNames?: ClassNames;
  };
}

export const SelectContext = createContext<Store>({
  selectedItems: null,
  handleValueChange: (selected) => {
    return selected;
  },
  classNames: undefined,
});

export const useSelectContext = (): Store => {
  return useContext(SelectContext);
};

const SelectProvider: React.FC<Props> = ({ selectedItems, handleValueChange, options, children }) => {
  const store = useMemo(() => {
    return {
      selectedItems,
      handleValueChange,
      classNames: options?.classNames,
    } as Store;
  }, [handleValueChange, options, selectedItems]);

  return <SelectContext.Provider value={store}>{children}</SelectContext.Provider>;
};

export default SelectProvider;
