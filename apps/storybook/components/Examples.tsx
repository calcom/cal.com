import { classNames } from "@calcom/lib";

interface ExampleProps {
  children: React.ReactNode;
  title: string;
  isFullWidth?: boolean;
}
export const Example = ({ children, title, isFullWidth = false }: ExampleProps) => {
  return (
    <div className={classNames("examples-item", isFullWidth && "w-full")}>
      <span className={classNames("examples-item-title", isFullWidth && "mb-0 mt-2")}>{title}</span>
      <div className="examples-item-content">{children}</div>
    </div>
  );
};

interface ExamplesProps {
  children: React.ReactNode;
  title: string;
  footnote?: React.ReactNode;
  dark?: boolean;
}

export const Examples = ({ children, title, footnote = null, dark }: ExamplesProps) => {
  return (
    <div className={classNames("examples", dark && "dark")}>
      <h2 className="examples-title">{title}</h2>
      <div className="examples-content">{children}</div>
      {!!footnote && <div className="examples-footnote">{footnote}</div>}
    </div>
  );
};
