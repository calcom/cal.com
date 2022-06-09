import React from "react";

const CalTime = (props) => {
  const { value, setValue, config, valueFormat, use12Hours, readonly, customProps } = props;

  const onChange = (e) => {
    let value = e.target.value;
    if (value == "") value = undefined;
    setValue(value);
  };

  return <input type="time" value={value || ""} disabled={readonly} onChange={onChange} {...customProps} />;
};

export default CalTime;
