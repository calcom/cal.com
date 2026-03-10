export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-subtle text-xs">{label}</span>
      <span className="text-emphasis text-right text-xs font-medium">{value}</span>
    </div>
  );
}
