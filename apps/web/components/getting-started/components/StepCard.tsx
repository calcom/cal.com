const StepCard: React.FC<{ children: React.ReactNode }> = (props) => {
  return (
    <div className="mt-11 rounded-md border border-gray-200 bg-white p-0 dark:bg-black sm:p-8">
      {props.children}
    </div>
  );
};

export { StepCard };
