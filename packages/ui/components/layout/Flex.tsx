import { cva, VariantProps } from "class-variance-authority";

export const flex = cva("flex", {
  variants: {
    direction: {
      horizontal: "",
      vertical: "flex-col",
    },
    wrap: {
      true: "flex-wrap",
      false: "flex-nowrap",
    },
    justify: {
      center: "justify-center",
      start: "justify-start",
      end: "justify-end",
      between: "justify-between",
      around: "justify-around",
    },
    align: {
      center: "items-center",
      start: "items-start",
      end: "items-end",
      stretch: "items-stretch",
    },
    self: {
      center: "self-center",
      start: "self-start",
      end: "self-end",
      stretch: "self-stretch",
    },
    spaceX: {
      0: "space-x-0",
      1: "space-x-1",
      2: "space-x-2",
      3: "space-x-3",
      4: "space-x-4",
      5: "space-x-5",
      6: "space-x-6",
      8: "space-x-8",
      10: "space-x-10",
    },
    spaceY: {
      0: "space-y-0",
      1: "space-y-1",
      2: "space-y-2",
      3: "space-y-3",
      4: "space-y-4",
      5: "space-y-5",
      6: "space-y-6",
      8: "space-y-8",
      10: "space-y-10",
    },
    flex: {
      1: "flex-1",
    },
  },
  defaultVariants: {
    direction: "horizontal",
    wrap: false,
  },
});

export interface FlexProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof flex> {}

export const Flex = ({
  children,
  direction,
  wrap,
  align,
  justify,
  self,
  spaceX,
  spaceY,
  className,
  ...rest
}: FlexProps) => {
  return (
    <div className={flex({ direction, wrap, align, justify, self, spaceX, spaceY, className })} {...rest}>
      {children}
    </div>
  );
};

export const Horizontal = ({ children, ...props }: FlexProps) => {
  return (
    <Flex direction="horizontal" {...props}>
      {children}
    </Flex>
  );
};

export const Vertical = ({ children, ...props }: FlexProps) => {
  return (
    <Flex direction="vertical" {...props}>
      {children}
    </Flex>
  );
};
