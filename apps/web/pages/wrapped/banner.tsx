import { motion } from "framer-motion";
import React from "react";

interface BannerProps {
  content: string;
}

const Banner: React.FC<BannerProps> = ({ content }) => {
  return (
    <div className="flex h-64 w-full items-center justify-center rounded-xl border-2 bg-gradient-to-r from-zinc-500 to-gray-500 p-5 shadow-lg">
      <motion.div
        initial={{ x: -500 }}
        whileInView={{ x: 0 }}
        transition={{ easings: ["easeOut"], duration: 1 }}>
        <h1 className="font-cal text-[60px] italic text-white">{content}</h1>
      </motion.div>
    </div>
  );
};

export default Banner;
