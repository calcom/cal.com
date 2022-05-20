import React from "react";

// core components
import CalButton from "./core/CalButton";
import CalButtonGroup from "./core/CalButtonGroup";
import CalConfirm from "./core/CalConfirm";
import CalConjs from "./core/CalConjs";
import CalFieldAutocomplete from "./core/CalFieldAutocomplete";
// field select widgets
import CalFieldSelect from "./core/CalFieldSelect";
import CalSwitch from "./core/CalSwitch";
import CalValueSources from "./core/CalValueSources";
import CalAutocompleteWidget from "./value/CalAutocomplete";
import CalBooleanWidget from "./value/CalBoolean";
import CalDateWidget from "./value/CalDate";
import CalDateTimeWidget from "./value/CalDateTime";
import CalMultiSelectWidget from "./value/CalMultiSelect";
import CalNumberWidget from "./value/CalNumber";
// import CalRangeWidget from "./value/CalRange";
import CalSelectWidget from "./value/CalSelect";
import CalSliderWidget from "./value/CalSlider";
// value widgets
import CalTextWidget from "./value/CalText";
import CalTextAreaWidget from "./value/CalTextArea";
import CalTimeWidget from "./value/CalTime";

// provider
const CalProvider = ({ config, children }: any) => children;

const CalWidgets = {
  CalTextWidget,
  CalTextAreaWidget,
  CalDateWidget,
  CalDateTimeWidget,
  CalTimeWidget,
  CalSelectWidget,
  CalNumberWidget,
  CalSliderWidget,
  CalRangeWidget: () => {
    return <div></div>;
  },
  CalBooleanWidget,
  CalMultiSelectWidget,
  CalAutocompleteWidget,

  CalFieldSelect,
  CalFieldAutocomplete,

  CalButton,
  CalButtonGroup,
  CalConjs,
  CalSwitch,
  CalValueSources,
  CalConfirm,
  // CalUseConfirm: useConfirm,

  CalProvider,
};
export default CalWidgets;
