import React from "react";
import { FormattedMessage } from "react-intl";
import toCamelCase from "@lib/toCamelCase";

export interface Props {
  id?: string;
  defaultMessage?: string;
  values?: { [id: string]: string | number | boolean };
  children?: string;
}

export const T = function t(props: Props) {
  const { defaultMessage, values } = props;
  const { children = defaultMessage } = props;
  if (!children) return <></>;
  let { id } = props;
  if (!id) {
    id = toCamelCase(children);
  }
  if (typeof children !== "string") return children;
  return (
    <div>
      <FormattedMessage id={id} defaultMessage={children} values={values} />
    </div>
  );
};

export default T;
