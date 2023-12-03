import { motion } from "framer-motion";
import React from "react";

const Mask = () => {
  return (
    <motion.div
      initial={{ x: 0 }}
      whileInView={{ x: 2000 }}
      transition={{ duration: 2, delay: 3 }}
      className="absolute top-0 h-full w-full">
      <div className="flex h-screen w-full items-center justify-end overflow-hidden bg-white/30 pr-5 backdrop-blur-md">
        <motion.div
          initial={{ x: -1000, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          transition={{ easings: ["easeOut"], duration: 3 }}>
          <h1 className="font-cal text-[100px] italic"> Wrapped </h1>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Mask;
