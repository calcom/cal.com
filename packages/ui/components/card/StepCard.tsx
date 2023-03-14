const StepCard: React.FC<{ children: React.ReactNode }> = (props) => {
  return <div className="mt-10 rounded-md border border-gray-200 bg-white p-4 sm:p-8">{props.children}</div>;
};

export { StepCard };
