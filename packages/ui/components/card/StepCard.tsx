const StepCard: React.FC<{ children: React.ReactNode }> = (props) => {
  return (
    <div className="sm:border-subtle bg-default mt-10  border p-4 dark:bg-black sm:rounded-md sm:p-8">
      {props.children}
    </div>
  );
};

export { StepCard };
