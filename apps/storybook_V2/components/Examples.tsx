interface ExampleProps {
  children: React.ReactNode;
  title: string;
}
export const Example = ({ children, title }: ExampleProps) => {
  return (
    <div className="examples-item">
      <span className="examples-item-title">{title}</span>
      <div className="examples-item-content">{children}</div>
    </div>
  );
};

interface ExamplesProps {
  children: React.ReactNode;
  title: string;
  footnote?: React.ReactNode;
}

export const Examples = ({ children, title, footnote = null }: ExamplesProps) => {
  return (
    <div className="examples">
      <h2 className="examples-title">{title}</h2>
      <div className="examples-content">{children}</div>
      {!!footnote && <div className="examples-footnote">{footnote}</div>}
    </div>
  );
};
