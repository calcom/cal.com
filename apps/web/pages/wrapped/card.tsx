import React from "react";

interface CardProps {
  content: string;
  numbers: number | undefined;
  unit: string;
}

const Card: React.FC<CardProps> = ({ content, numbers, unit }) => {
  return (
    <div className="flex h-80 flex-1 flex-row rounded-xl border-2 bg-white shadow-lg">
      <div className="flex w-[30%] pl-4">
        <h1 className="font-caltext-start text-[80px]">🎉</h1>
      </div>
      <div className="flex flex-1 flex-col items-start justify-center space-y-3 p-3 text-left">
        <h1 className="font-cal text-[60px] text-black">{content}</h1>
        <p className="font-cal text-left text-[30px] text-black opacity-70">
          {numbers !== undefined ? Math.floor(numbers) : ""} {unit}
        </p>
      </div>
    </div>
  );
};

export default Card;
