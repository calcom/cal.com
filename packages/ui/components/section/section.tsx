import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Slot } from "@radix-ui/react-slot";

import cn from "../../classNames";
import type { IconName } from "../icon";
import { Icon as IconComponent } from "../icon";

const Root = ({ children, ref }: { children: React.ReactNode; ref?: React.Ref<HTMLDivElement> }) => {
  const [animateRef] = useAutoAnimate<HTMLDivElement>();

  return (
    <div ref={animateRef} className="bg-muted flex flex-col gap-4 rounded-2xl p-4">
      {children}
    </div>
  );
};

const Title = ({
  children,
  ref,
  as,
}: {
  children: React.ReactNode;
  ref?: React.Ref<HTMLHeadingElement>;
  as?: React.ElementType;
}) => {
  const Component = as ? Slot : "h2";
  return (
    <Component ref={ref} className="text-emphasis text-base font-semibold leading-none">
      {children}
    </Component>
  );
};

const Description = ({
  children,
  ref,
  as,
}: {
  children: React.ReactNode;
  ref?: React.Ref<HTMLHeadingElement>;
  as?: React.ElementType;
}) => {
  const Component = as ? Slot : "h3";
  return (
    <Component ref={ref} className="text-subtle line-clamp-1 text-sm">
      {children}
    </Component>
  );
};

const Icon = ({
  ref,
  name,
  size = "md",
  iconSlot,
}: {
  ref?: React.Ref<HTMLDivElement>;
  size?: "sm" | "md";
  name?: IconName;
  iconSlot?: React.ReactNode;
} & ({ name: IconName; iconSlot?: never } | { name?: never; iconSlot: React.ReactNode })) => {
  return (
    <div
      ref={ref}
      className={cn(
        "bg-default border-subtle border-subtle inline-flex items-center justify-center border",
        size === "sm" && "rounded-md p-1",
        size === "md" && "rounded-[10px] p-1.5"
      )}>
      {iconSlot ? (
        iconSlot
      ) : (
        <IconComponent name={name!} className={cn(size === "sm" && "h-4 w-4", size === "md" && "h-6 w-6")} />
      )}
    </div>
  );
};

const Header = ({
  children,
  ref,
  icon,
  title,
  description,
  iconSlot,
}: {
  children: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
  icon?: IconName;
  iconSlot?: React.ReactNode;
  title?: string;
  description?: string;
}) => {
  return (
    <div ref={ref} className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {icon && !iconSlot && <Icon name={icon} />}
        {iconSlot && <Icon iconSlot={iconSlot} />}
        <div className="flex flex-col gap-0.5">
          {title && <Title>{title}</Title>}
          {description && <Description>{description}</Description>}
        </div>
      </div>
      {children}
    </div>
  );
};

const Content = ({ children, ref }: { children: React.ReactNode; ref?: React.Ref<HTMLDivElement> }) => {
  return (
    <div ref={ref} className="flex flex-col gap-4">
      {children}
    </div>
  );
};

const SubSection = ({ children, ref }: { children: React.ReactNode; ref?: React.Ref<HTMLDivElement> }) => {
  const [animateRef] = useAutoAnimate<HTMLDivElement>();

  return (
    <div ref={animateRef} className="border-muted bg-default flex flex-col gap-4 rounded-xl border p-3">
      {children}
    </div>
  );
};

const SubSectionHeader = ({
  children,
  ref,
  icon,
  title,
  classNames,
  justify = "between",
  labelFor,
}: {
  children: React.ReactNode;
  icon?: IconName;
  title: string;
  labelFor?: string;
  classNames?: {
    container?: string;
    title?: string;
    description?: string;
  };
  ref?: React.Ref<HTMLDivElement>;
  justify?: "between" | "start";
}) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-2",
        justify === "between" ? "justify-between" : "justify-start",
        classNames?.container
      )}>
      <div className={cn("flex items-center gap-2", classNames?.title)}>
        {icon && <Icon name={icon} size="sm" />}
        <div className={cn("flex", classNames?.title)}>
          <h4 className="text-default text-sm font-medium leading-none" id={labelFor}>
            {title}
          </h4>
        </div>
      </div>
      {children}
    </div>
  );
};

const SubSectionHeaderRight = ({
  children,
  ref,
}: {
  children: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}) => {
  return (
    <div ref={ref} className="flex items-center justify-end">
      {children}
    </div>
  );
};

const SubSectionIcon = ({ icon, ref }: { icon: IconName; ref?: React.Ref<HTMLDivElement> }) => {
  return (
    <div
      ref={ref}
      className="bg-default border-subtle border-subtle text-subtle rounded-[10px] rounded-lg border p-1">
      <IconComponent name={icon} />
    </div>
  );
};

const SubSectionContent = ({
  children,
  ref,
  invert,
}: {
  children: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
  invert?: boolean;
}) => {
  return (
    <div
      ref={ref}
      className={cn("bg-muted flex flex-col rounded-lg p-2.5", invert && "bg-default border-subtle border")}>
      {children}
    </div>
  );
};

const SubSectionNested = ({
  children,
  ref,
}: {
  children: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}) => {
  return (
    <div ref={ref} className="bg-default border-subtle flex flex-col gap-2 rounded-xl border p-2">
      {children}
    </div>
  );
};

export const Section = Object.assign(Root, {
  Header: Header,
  Content: Content,
  SubSection: SubSection,
  SubSectionHeader: SubSectionHeader,
  SubSectionContent: SubSectionContent,
  SubSectionNested: SubSectionNested,
});
