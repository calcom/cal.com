// import FormControl from "@material-ui/core/FormControl";
// import MenuItem from "@material-ui/core/MenuItem";
// import Select from "@material-ui/core/Select";
// import omit from "lodash/omit";
import React from "react";

import Select from "@components/ui/form/Select";

// import { mapListValues } from "../../../../utils/stuff";

export default function CalSelect({ listValues, setValue, value }) {
  const selectItems = listValues.map((item) => {
    return {
      label: item.title,
      value: item.value,
    };
  });
  const defaultValue = selectItems.find((item) => item.value === value);

  return (
    <Select
      menuPosition="fixed"
      onChange={(item) => {
        setValue(item.value);
      }}
      defaultValue={defaultValue}
      options={selectItems}></Select>
  );
}
