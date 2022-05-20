import React from "react";

// import { mapListValues } from "../../../../utils/stuff";
import Select from "@components/ui/form/Select";

export default function CalFieldSelect({ items, setField, selectedKey }) {
  const selectItems = items.map((item) => {
    return {
      ...item,
      value: item.key,
    };
  });

  const defaultValue = selectItems.find((item) => {
    return item.value === selectedKey;
  });

  return (
    <Select
      menuPosition="fixed"
      onChange={(item) => {
        setField(item.value);
      }}
      defaultValue={defaultValue}
      options={selectItems}></Select>
  );
}
