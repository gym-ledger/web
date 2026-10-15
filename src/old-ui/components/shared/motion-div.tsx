"use client";

import { motion } from "framer-motion";

interface MotionDivProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function MotionPage({ children, className, delay = 0 }: MotionDivProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionCard({ children, className, delay = 0 }: MotionDivProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
