import { isPlainObject } from "@lib/core/typeguards";

type Params = {
  message?: string;
  props?: Record<string, unknown> | unknown;
};

export class ErrorWithProps extends Error {
  public props: Params["props"];

  constructor(params: Params) {
    const { props = {} } = params;
    let msg = params.message ?? "Unknown message";
    if (isPlainObject(props)) {
      try {
        msg = `${msg}: ${JSON.stringify(props)}`;
      } catch (e) {
        // eslint-disable-next-line no-empty
      }
    }
    super(msg);
    this.props = props;
    Object.setPrototypeOf(this, ErrorWithProps.prototype);
    this.name = ErrorWithProps.prototype.constructor.name;
  }

  static createFromProps(props: Params["props"], message?: string): ErrorWithProps {
    return new ErrorWithProps({
      message,
      props: props ?? {},
    });
  }
}
