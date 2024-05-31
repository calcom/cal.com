import { ArgsTable } from "@storybook/addon-docs";
import type { SortType } from "@storybook/blocks";
import type { PropDescriptor } from "@storybook/preview-api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ignore storybook addon types component as any so we have to do
type Component = any;
type BaseProps = {
  include?: PropDescriptor;
  exclude?: PropDescriptor;
  sort?: SortType;
};

type OfProps = BaseProps & {
  of: "." | "^" | Component;
};

export function CustomArgsTable({ of, sort }: OfProps) {
  return (
    <div className="custom-args-wrapper">
      <ArgsTable of={of} sort={sort} />
    </div>
  );
}
