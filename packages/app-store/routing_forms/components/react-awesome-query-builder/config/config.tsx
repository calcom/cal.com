import React from "react";
//@ts-ignore
import BasicConfig, { stringifyForDisplay } from "react-awesome-query-builder/lib/config/basic";

import CalWidgets from "../widgets";

const {
  CalBooleanWidget,
  CalTextWidget,
  CalTextAreaWidget,
  CalMultiSelectWidget,
  CalSelectWidget,
  CalNumberWidget,
  CalAutocompleteWidget,
  CalFieldSelect,
  CalFieldAutocomplete,
  CalConjs,
  CalSwitch,
  CalButton,
  CalButtonGroup,
  CalValueSources,
  CalProvider,
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
  groupActionsPosition: "bottomCenter",
  // Disable groups
  maxNesting: 1,
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
  boolean: {
    ...BasicConfig.widgets.boolean,
    factory: (props) => <CalBooleanWidget {...props} />,
  },
  phone: {
    ...BasicConfig.widgets.text,
    factory: (props) => <CalTextWidget type="tel" {...props} />,
    valuePlaceholder: "Select range",
  },
  email: {
    ...BasicConfig.widgets.text,
    factory: (props) => <CalTextWidget type="email" {...props} />,
  },
};

const types = {
  ...BasicConfig.types,
  phone: {
    ...BasicConfig.types.text,
    widgets: {
      ...BasicConfig.types.text.widgets,
    },
  },
  email: {
    ...BasicConfig.types.text,
    widgets: {
      ...BasicConfig.types.text.widgets,
    },
  },
};

const operators = BasicConfig.operators;
operators.equal.label = operators.select_equals.label = "Equals";
operators.greater_or_equal.label = "Greater than or equal to";
operators.greater.label = "Greater than";
operators.less_or_equal.label = "Less than or equal to";
operators.less.label = "Less than";
operators.not_equal.label = operators.select_not_equals.label = "Does not equal";
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
