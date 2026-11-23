"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

/** Fades/slides content in when it scrolls into view. Uses only transform + opacity. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  ...rest
}: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
