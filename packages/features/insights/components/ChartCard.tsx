import { Button } from "@calcom/ui/components/button";

export function ChartCard({
  title,
  cta,
  children,
}: {
  title: string;
  cta?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <div className="border-subtle bg-muted group relative w-full items-center rounded-2xl border px-1 pb-1">
      <div className="flex items-center justify-between py-3">
        <h2 className="text-emphasis ml-4 text-sm font-semibold">{title}</h2>
        {cta && (
          <Button className="mr-3" color="secondary" onClick={cta.onClick}>
            {cta.label}
          </Button>
        )}
      </div>
      <div className="bg-default border-default w-full gap-3 rounded-xl border">{children}</div>
    </div>
  );
}
