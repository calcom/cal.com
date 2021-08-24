import React from 'react';
import Select, { components } from 'react-select';
import classNames from "@lib/classNames";

const SelectComp = React.forwardRef( (props, ref) => (
  <Select
    theme={(theme) => ({
      ...theme,
      borderRadius: '2px',
      colors: {
        ...theme.colors,
        primary: 'rgba(17, 17, 17, var(--tw-bg-opacity))',
        primary50: 'rgba(17, 17, 17, var(--tw-bg-opacity))',
        primary25: 'rgba(244, 245, 246, var(--tw-bg-opacity))',
      },
    })}
    components={{
      ...components,
      IndicatorSeparator: () => null,
    }}
    className={classNames(
      "text-sm shadow-sm focus:border-primary-500",
      props.className,
    )}
    {...props}
  />
));

SelectComp.displayName = "Select";

export default SelectComp;
