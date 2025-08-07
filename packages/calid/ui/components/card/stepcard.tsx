const StepCard: React.FC<{ children: React.ReactNode }> = (props) => {
  return (
    <div className="sm:border-subtle mt-10 border bg-white p-4 sm:rounded-md sm:p-8">{props.children}</div>
  );
};

export { StepCard };
