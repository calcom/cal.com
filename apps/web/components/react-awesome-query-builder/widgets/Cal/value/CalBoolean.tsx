import React from "react";
import { Utils as QbUtils } from "react-awesome-query-builder";

const CalBoolean = (props) => {
  const { value, setValue, config, labelYes, labelNo, readonly, customProps = {} } = props;
  const customRadioYesProps = customProps.radioYes || {};
  const customRadioNoProps = customProps.radioNo || {};

  const onCheckboxChange = (e) => setValue(e.target.checked);
  const onRadioChange = (e) => setValue(e.target.value == "true");
  const id = QbUtils.uuid(),
    id2 = QbUtils.uuid();

  // return <>
  //     <input key={id}  type="checkbox" id={id} checked={!!value} disabled={readonly} onChange={onCheckboxChange} />
  //     <label style={{display: "inline"}} key={id+"label"}  htmlFor={id}>{value ? labelYes : labelNo}</label>
  // </>;

  return (
    <>
      <input
        key={id}
        type="radio"
        id={id}
        value={true}
        checked={!!value}
        disabled={readonly}
        onChange={onRadioChange}
        {...customRadioYesProps}
      />
      <label style={{ display: "inline" }} key={id + "label"} htmlFor={id}>
        {labelYes}
      </label>
      <input
        key={id2}
        type="radio"
        id={id2}
        value={false}
        checked={!value}
        disabled={readonly}
        onChange={onRadioChange}
        {...customRadioNoProps}
      />
      <label style={{ display: "inline" }} key={id2 + "label"} htmlFor={id2}>
        {labelNo}
      </label>
    </>
  );
};

export default CalBoolean;
