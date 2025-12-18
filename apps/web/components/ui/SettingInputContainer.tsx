export default function SettingInputContainer({
  Input,
  Icon,
  label,
  htmlFor,
}: {
  Input: React.ReactNode;
  Icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element | null;
  label: string;
  htmlFor?: string;
}) {
  return (
    <div className="stack-y-3">
      <div className="block sm:flex">
        <div className="min-w-48 mb-4 sm:mb-0">
          <label htmlFor={htmlFor} className="text-default mt-1 flex text-sm font-medium">
            <Icon className="text-subtle mt-0.5 h-4 w-4 ltr:mr-2 rtl:ml-2" />
            {label}
          </label>
        </div>
        <div className="w-full grow">{Input}</div>
      </div>
    </div>
  );
}
