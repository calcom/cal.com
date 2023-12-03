import { theme } from "@pages/wrapped/colorTheme";
import React from "react";

interface CardProps {
  content: string;
  themeIdx: string;
}

const TeamCard: React.FC<CardProps> = ({ content, themeIdx }) => {
  return (
    <div
      className={`h-50 flex flex-1 flex-row rounded-xl border-2 bg-gradient-to-r ${theme[themeIdx]} shadow-lg`}>
      <div className="flex flex-1 flex-col items-start justify-center space-y-3 p-3 text-left">
        <h1 className="font-cal text-[60px] text-black">{content}</h1>
      </div>
    </div>
  );
};

export default TeamCard;
