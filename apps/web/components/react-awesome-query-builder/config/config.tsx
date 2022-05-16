import React from "react";
//@ts-ignore
import BasicConfig, { stringifyForDisplay } from "react-awesome-query-builder/lib/config/basic";

import CalWidgets from "../widgets/Cal";

const {
  CalBooleanWidget,
  CalTextWidget,
  CalTextAreaWidget,
  CalDateWidget,
  CalTimeWidget,
  CalDateTimeWidget,
  CalMultiSelectWidget,
  CalSelectWidget,
  CalNumberWidget,
  CalSliderWidget,
  CalRangeWidget,
  CalAutocompleteWidget,

  CalFieldSelect,
  CalFieldAutocomplete,
  CalConjs,
  CalSwitch,
  CalButton,
  CalButtonGroup,
  CalValueSources,

  CalProvider,
  CalConfirm,
  CalUseConfirm,
} = CalWidgets;

const settings = {
  ...BasicConfig.settings,

  renderField: (props) =>
    props?.customProps?.showSearch ? <CalFieldAutocomplete {...props} /> : <CalFieldSelect {...props} />,
  renderOperator: (props) => <CalFieldSelect {...props} />,
  renderFunc: (props) => <CalFieldSelect {...props} />,
  renderConjs: (props) => <CalConjs {...props} />,
  renderSwitch: (props) => <CalSwitch {...props} />,
  renderButton: (props) => <CalButton {...props} />,
  renderButtonGroup: (props) => <CalButtonGroup {...props} />,
  renderValueSources: (props) => <CalValueSources {...props} />,
  renderProvider: (props) => <CalProvider {...props} />,
  renderConfirm: CalConfirm,
  // useConfirm: CalUseConfirm,
};

const widgets = {
  ...BasicConfig.widgets,
  text: {
    ...BasicConfig.widgets.text,
    factory: (props) => <CalTextWidget {...props} />,
  },
  textarea: {
    ...BasicConfig.widgets.textarea,
    factory: (props) => <CalTextAreaWidget {...props} />,
  },
  number: {
    ...BasicConfig.widgets.number,
    factory: (props) => <CalNumberWidget {...props} />,
  },
  multiselect: {
    ...BasicConfig.widgets.multiselect,
    factory: (props) => {
      return props.asyncFetch || props.showSearch ? (
        <CalAutocompleteWidget multiple {...props} />
      ) : (
        <CalMultiSelectWidget {...props} />
      );
    },
  },
  select: {
    ...BasicConfig.widgets.select,
    factory: (props) => {
      return props.asyncFetch || props.showSearch ? (
        <CalAutocompleteWidget {...props} />
      ) : (
        <CalSelectWidget {...props} />
      );
    },
  },
  slider: {
    ...BasicConfig.widgets.slider,
    factory: (props) => <CalSliderWidget {...props} />,
  },
  boolean: {
    ...BasicConfig.widgets.boolean,
    factory: (props) => <CalBooleanWidget {...props} />,
  },
  date: {
    ...BasicConfig.widgets.date,
    factory: (props) => <CalDateWidget {...props} />,
  },
  time: {
    ...BasicConfig.widgets.time,
    factory: (props) => <CalTimeWidget {...props} />,
  },
  datetime: {
    ...BasicConfig.widgets.datetime,
    factory: (props) => <CalDateTimeWidget {...props} />,
  },

  rangeslider: {
    type: "number",
    jsType: "number",
    valueSrc: "value",
    factory: (props) => <CalRangeWidget {...props} />,
    valueLabel: "Range",
    valuePlaceholder: "Select range",
    valueLabels: [
      { label: "Number from", placeholder: "Enter number from" },
      { label: "Number to", placeholder: "Enter number to" },
    ],
    formatValue: (val, fieldDef, wgtDef, isForDisplay) => {
      return isForDisplay ? stringifyForDisplay(val) : JSON.stringify(val);
    },
    singleWidget: "slider",
    toJS: (val, fieldSettings) => val,
  },
};

const types = {
  ...BasicConfig.types,
  number: {
    ...BasicConfig.types.number,
    widgets: {
      ...BasicConfig.types.number.widgets,
      rangeslider: {
        opProps: {
          between: {
            isSpecialRange: true,
          },
          not_between: {
            isSpecialRange: true,
          },
        },
        operators: ["between", "not_between", "is_null", "is_not_null"],
      },
    },
  },
};

export default {
  ...BasicConfig,
  types,
  widgets,
  settings,
};
