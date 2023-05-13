const StepCard: React.FC<{ children: React.ReactNode }> = (props) => {
  return (
    <div className="border-subtle bg-default mt-10  rounded-md border p-4 dark:bg-black sm:p-8">
      {props.children}
    </div>
  );
};

export { StepCard };
