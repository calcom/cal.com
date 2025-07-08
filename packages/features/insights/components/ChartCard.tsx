import { Fragment } from "react";

import { Button } from "@calcom/ui/components/button";

type LegendItem = {
  label: string;
  color: string; // hex format
};

export function ChartCard({
  title,
  subtitle,
  cta,
  legend,
  children,
}: {
  title: string;
  subtitle?: string;
  cta?: { label: string; onClick: () => void };
  legend?: Array<LegendItem>;
  children: React.ReactNode;
}) {
  return (
    <div className="border-subtle bg-muted group relative w-full items-center rounded-2xl border px-1 pb-1">
      <div className="flex h-11 items-center justify-between px-4">
        <h2 className="text-emphasis text-sm font-semibold">{title}</h2>
        {legend && (legend || []).length > 0 && <Legend items={legend} />}
        {cta && (
          <Button className="mr-3" color="secondary" onClick={cta.onClick}>
            {cta.label}
          </Button>
        )}
      </div>
      <div className="bg-default border-default w-full gap-3 rounded-xl border">
        {subtitle && (
          <div className="text-subtle border-muted border-b p-3 text-sm font-medium leading-none">
            {subtitle}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function Legend({ items }: { items: LegendItem[] }) {
  return (
    <div className="bg-default flex items-center gap-2 rounded-lg px-1.5 py-1">
      {items.map((item, index) => (
        <Fragment key={item.label}>
          <div
            key={item.label}
            className="relative flex items-center gap-2 rounded-md px-1.5 py-1"
            style={{ backgroundColor: `${item.color}33` }}>
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-default text-sm font-medium leading-none">{item.label}</span>
          </div>
          {index < items.length - 1 && <div className="bg-muted h-5 w-[1px]" />}
        </Fragment>
      ))}
    </div>
  );
}
