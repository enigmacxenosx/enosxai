import { motion } from "framer-motion";

interface BrandMarkProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export default function BrandMark({ size = 96, className = "", animate = false }: BrandMarkProps) {
  return (
    <div
      aria-label="ENOSX AI"
      className={`relative flex items-center justify-center rounded-[24%] border border-white/20 shadow-2xl overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {animate && (
        <motion.div
          aria-hidden="true"
          animate={{ left: ["-100%", "200%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
          className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
        />
      )}
      <span
        className="relative z-10 font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
        style={{ fontSize: size * 0.39, lineHeight: 1 }}
      >
        EX
      </span>
    </div>
  );
}
