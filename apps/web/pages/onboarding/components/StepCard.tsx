const StepCard: React.FC<{ children: React.ReactNode }> = (props) => {
  return (
    <div className="mt-11 rounded-md border-2 border-gray-200 bg-white p-10 dark:bg-black">
      {props.children}
    </div>
  );
};

export { StepCard };
