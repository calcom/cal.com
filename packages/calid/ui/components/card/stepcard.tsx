const StepCard: React.FC<{ children: React.ReactNode }> = (props) => {
  return (
    <div className="border-subtle shadow-md mt-10 border bg-white p-4 rounded-md">{props.children}</div>
  );
};

export { StepCard };
