import { motion } from "framer-motion";

interface BrandMarkProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export default function BrandMark({ size = 96, className = "", animate = false }: BrandMarkProps) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      {animate && (
        <motion.div
          aria-hidden="true"
          animate={{ left: ["-100%", "200%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
          className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
        />
      )}
      <img
        src="/enosx-logo-mark.png"
        alt="ENOSX AI"
        draggable={false}
        className="relative z-10 h-full w-full object-contain"
      />
    </div>
  );
}
