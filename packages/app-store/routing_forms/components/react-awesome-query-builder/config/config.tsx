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
  groupActionsPosition: "bottomCenter",
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
/*{
  "less": {
      "label": "<",
      "labelForFormat": "<",
      "sqlOp": "<",
      "spelOp": "<",
      "spelOps": [
          "<",
          "lt"
      ],
      "reversedOp": "greater_or_equal",
      "jsonLogic": "<",
      "elasticSearchQueryType": "range"
  },
  "greater": {
      "label": ">",
      "labelForFormat": ">",
      "sqlOp": ">",
      "spelOp": ">",
      "spelOps": [
          ">",
          "gt"
      ],
      "reversedOp": "less_or_equal",
      "jsonLogic": ">",
      "elasticSearchQueryType": "range"
  },
  "like": {
      "label": "Contains",
      "labelForFormat": "Contains",
      "reversedOp": "not_like",
      "sqlOp": "LIKE",
      "spelOp": ".contains",
      "spelOps": [
          "matches",
          ".contains"
      ],
      "jsonLogic": "in",
      "_jsonLogicIsRevArgs": true,
      "valueSources": [
          "value"
      ],
      "elasticSearchQueryType": "regexp"
  },
  "not_like": {
      "isNotOp": true,
      "label": "Not contains",
      "reversedOp": "like",
      "labelForFormat": "Not Contains",
      "sqlOp": "NOT LIKE",
      "valueSources": [
          "value"
      ]
  },
  "starts_with": {
      "label": "Starts with",
      "labelForFormat": "Starts with",
      "sqlOp": "LIKE",
      "spelOp": ".startsWith",
      "spelOps": [
          "matches",
          ".startsWith"
      ],
      "valueSources": [
          "value"
      ]
  },
  "ends_with": {
      "label": "Ends with",
      "labelForFormat": "Ends with",
      "sqlOp": "LIKE",
      "spelOp": ".endsWith",
      "spelOps": [
          "matches",
          ".endsWith"
      ],
      "valueSources": [
          "value"
      ]
  },
  "not_between": {
      "isNotOp": true,
      "label": "Not between",
      "labelForFormat": "NOT BETWEEN",
      "sqlOp": "NOT BETWEEN",
      "cardinality": 2,
      "valueLabels": [
          "Value from",
          "Value to"
      ],
      "textSeparators": [
          null,
          "and"
      ],
      "reversedOp": "between"
  },
  "is_empty": {
      "label": "Is empty",
      "labelForFormat": "IS EMPTY",
      "cardinality": 0,
      "reversedOp": "is_not_empty",
      "jsonLogic": "!"
  },
  "is_not_empty": {
      "isNotOp": true,
      "label": "Is not empty",
      "labelForFormat": "IS NOT EMPTY",
      "cardinality": 0,
      "reversedOp": "is_empty",
      "jsonLogic": "!!",
      "elasticSearchQueryType": "exists"
  },
  "is_null": {
      "label": "Is null",
      "labelForFormat": "IS NULL",
      "sqlOp": "IS NULL",
      "cardinality": 0,
      "reversedOp": "is_not_null",
      "jsonLogic": "=="
  },
  "is_not_null": {
      "label": "Is not null",
      "labelForFormat": "IS NOT NULL",
      "sqlOp": "IS NOT NULL",
      "cardinality": 0,
      "reversedOp": "is_null",
      "jsonLogic": "!=",
      "elasticSearchQueryType": "exists"
  },
  "select_equals": {
      "label": "==",
      "labelForFormat": "==",
      "sqlOp": "=",
      "spelOp": "==",
      "spelOps": [
          "==",
          "eq"
      ],
      "reversedOp": "select_not_equals",
      "jsonLogic": "==",
      "elasticSearchQueryType": "term"
  },
  "select_not_equals": {
      "isNotOp": true,
      "label": "!=",
      "labelForFormat": "!=",
      "sqlOp": "<>",
      "spelOp": "!=",
      "spelOps": [
          "!=",
          "ne"
      ],
      "reversedOp": "select_equals",
      "jsonLogic": "!="
  },
  "select_any_in": {
      "label": "Any in",
      "labelForFormat": "IN",
      "sqlOp": "IN",
      "spelOp": "$contains",
      "reversedOp": "select_not_any_in",
      "jsonLogic": "in",
      "elasticSearchQueryType": "term"
  },
  "select_not_any_in": {
      "isNotOp": true,
      "label": "Not in",
      "labelForFormat": "NOT IN",
      "sqlOp": "NOT IN",
      "reversedOp": "select_any_in"
  },
  "multiselect_equals": {
      "label": "Equals",
      "labelForFormat": "==",
      "sqlOp": "=",
      "spelOp": ".equals",
      "reversedOp": "multiselect_not_equals",
      "jsonLogic2": "all-in",
      "elasticSearchQueryType": "term"
  },
  "multiselect_not_equals": {
      "isNotOp": true,
      "label": "Not equals",
      "labelForFormat": "!=",
      "sqlOp": "<>",
      "reversedOp": "multiselect_equals"
  },
  "proximity": {
      "label": "Proximity search",
      "cardinality": 2,
      "valueLabels": [
          {
              "label": "Word 1",
              "placeholder": "Enter first word"
          },
          {
              "label": "Word 2",
              "placeholder": "Enter second word"
          }
      ],
      "textSeparators": [],
      "options": {
          "optionLabel": "Near",
          "optionTextBefore": "Near",
          "optionPlaceholder": "Select words between",
          "minProximity": 2,
          "maxProximity": 10,
          "defaults": {
              "proximity": 2
          }
      }
  },
  "some": {
      "label": "Some",
      "labelForFormat": "SOME",
      "cardinality": 0,
      "jsonLogic": "some"
  },
  "all": {
      "label": "All",
      "labelForFormat": "ALL",
      "cardinality": 0,
      "jsonLogic": "all"
  },
  "none": {
      "label": "None",
      "labelForFormat": "NONE",
      "cardinality": 0,
      "jsonLogic": "none"
  }
}*/
const operators = BasicConfig.operators;
operators.equal.label = "Equals";
operators.greater_or_equal.label = "Greater than or equal to";
operators.greater.label = "Greater than";
operators.less_or_equal.label = "Less than or equal to";
operators.less.label = "Less than";
operators.not_equal.label = "Does not equal";
operators.between.label = "Between";

delete operators.proximity;
delete operators.is_null;
delete operators.is_not_null;
export default {
  conjunctions: BasicConfig.conjunctions,
  operators,
  types,
  widgets,
  settings,
};
