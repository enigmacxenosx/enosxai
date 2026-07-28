/*
 * ENOSX AI Assistant — AboutPage
 * Vision Manifesto: "Redefining the boundary between Human and OS"
 * Design: Vertical scroll reveals, ghosted E background, premium animations
 */

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Zap, Cpu, Palette, Mail, ArrowRight, ArrowLeft, Bot } from "lucide-react";

const BG_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663581012760/3KsVJNzTNHX32FLQf9aZCC/enosx-bg-mesh-dMF6AjTJ234cK4z3d5pivU.webp";

export default function AboutPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const eOpacity = useTransform(scrollYProgress, [0, 0.3], [0.15, 0.05]);
  const eScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.2]);

  const techStack = [
    {
      icon: Zap,
      title: "Intelligence",
      description: "Custom-tuned LLM layers for system automation",
      color: "#00F2FF",
    },
    {
      icon: Cpu,
      title: "Architecture",
      description: "Powered by OpenRouter for flexible AI model selection",
      color: "#7000FF",
    },
    {
      icon: Palette,
      title: "Design",
      description: 'Next-generation "Aero-Glass" UI with iridescent neon accents',
      color: "#FF0080",
    },
  ];

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen overflow-hidden bg-black"
      style={{
        background: `url(${BG_URL}) center/cover, linear-gradient(135deg, #0a0a0a, #050505)`,
        backgroundAttachment: "fixed",
      }}
    >
      <div className="fixed left-0 right-0 top-0 z-30 px-5 py-4 pointer-events-none">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <motion.a
            href="/"
            whileHover={{ scale: 1.03, x: -2 }}
            whileTap={{ scale: 0.96 }}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
            style={{
              background: "rgba(5, 8, 14, 0.72)",
              borderColor: "rgba(0, 242, 255, 0.22)",
              color: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <ArrowLeft size={16} />
            Back to Chat
          </motion.a>
          <motion.a
            href="/"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black"
            style={{
              background: "rgba(5, 8, 14, 0.72)",
              borderColor: "rgba(112, 0, 255, 0.24)",
              color: "#00F2FF",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              letterSpacing: "-0.02em",
            }}
          >
            <Bot size={16} />
            ENOSX AI
          </motion.a>
        </div>
      </div>

      {/* Ghosted E Background */}
      <motion.div
        className="fixed inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: eOpacity, scale: eScale }}
      >
        <div
          style={{
            fontSize: "clamp(200px, 50vw, 800px)",
            fontWeight: 900,
            color: "rgba(0, 242, 255, 0.08)",
            letterSpacing: "-0.05em",
            textShadow: "0 0 60px rgba(0, 242, 255, 0.15)",
            filter: "blur(1px)",
          }}
        >
          E
        </div>
      </motion.div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mb-32 text-center"
        >
          <h1
            className="text-6xl md:text-7xl font-black mb-6"
            style={{
              background: "linear-gradient(135deg, #00F2FF, #7000FF, #FF0080)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            The Vision
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-light"
            style={{
              color: "rgba(255,255,255,0.7)",
              letterSpacing: "0.02em",
              lineHeight: 1.6,
            }}
          >
            ENOSX AI: redefining the boundary between Human and OS.
          </motion.p>
        </motion.div>

        {/* Story Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mb-32"
        >
          <h2
            className="text-4xl font-bold mb-8"
            style={{ color: "rgba(255,255,255,0.95)" }}
          >
            The Story
          </h2>
          <div
            className="rounded-2xl p-8 border"
            style={{
              background: "rgba(0, 242, 255, 0.04)",
              borderColor: "rgba(0, 242, 255, 0.15)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            <p
              className="text-lg leading-relaxed"
              style={{ color: "rgba(255,255,255,0.75)" }}
            >
              Enosx Technologies was born out of a simple necessity: the need for 
              an AI that doesn't just "chat," but operates. Founded by Enosh, 
              the vision was a system that breathes with the OS—a fluid, 
              iridescent interface powered by high-performance architecture 
              and proprietary design language.
            </p>
          </div>
        </motion.div>

        {/* Founder Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mb-32"
        >
          <h2
            className="text-4xl font-bold mb-8"
            style={{ color: "rgba(255,255,255,0.95)" }}
          >
            The Founder
          </h2>
          <div
            className="rounded-2xl p-8 border"
            style={{
              background: "linear-gradient(135deg, rgba(255, 215, 0, 0.08), rgba(255, 140, 0, 0.04))",
              borderColor: "rgba(255, 215, 0, 0.2)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            <div className="flex items-start gap-6 mb-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #FFD700, #FF8C00)",
                  boxShadow: "0 0 20px rgba(255, 215, 0, 0.4)",
                }}
              >
                <span
                  className="text-2xl font-black"
                  style={{ color: "#0a0a0a" }}
                >
                  E
                </span>
              </div>
              <div>
                <h3
                  className="text-2xl font-bold mb-2"
                  style={{
                    background: "linear-gradient(135deg, #FFD700, #FF8C00)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Enosh
                </h3>
                <p
                  className="text-sm"
                  style={{ color: "rgba(255, 215, 0, 0.7)" }}
                >
                  Founder & Visionary
                </p>
              </div>
            </div>
            <p
              className="text-lg leading-relaxed"
              style={{ color: "rgba(255,255,255,0.75)" }}
            >
              Enosh leads the design and architectural direction of the ENOSX 
              ecosystem. His philosophy is simple: Speed is UX. By leveraging 
              high-performance inference engines and a glassmorphic design 
              language, Enosh has turned the standard desktop into an intelligent 
              workspace.
            </p>
          </div>
        </motion.div>

        {/* Tech Stack Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mb-32"
        >
          <h2
            className="text-4xl font-bold mb-12"
            style={{ color: "rgba(255,255,255,0.95)" }}
          >
            The Tech Stack
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {techStack.map((tech, idx) => {
              const Icon = tech.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.15, duration: 0.6 }}
                  viewport={{ once: true }}
                  className="rounded-xl p-6 border group hover:scale-105 transition-transform"
                  style={{
                    background: `rgba(${tech.color === "#00F2FF" ? "0, 242, 255" : tech.color === "#7000FF" ? "112, 0, 255" : "255, 0, 128"}, 0.06)`,
                    borderColor: `${tech.color}40`,
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                  }}
                >
                  <div className="mb-4">
                    <Icon
                      size={28}
                      style={{
                        color: tech.color,
                        filter: `drop-shadow(0 0 8px ${tech.color}40)`,
                      }}
                    />
                  </div>
                  <h3
                    className="text-lg font-bold mb-2"
                    style={{ color: tech.color }}
                  >
                    {tech.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    {tech.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-20"
        >
          <p
            className="text-lg mb-8"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            Interested in the future of AI-OS integration?
          </p>
          <motion.a
            href="mailto:proenosx@gmail.com"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, #00F2FF, #7000FF)",
              color: "#0a0a0a",
              boxShadow: "0 0 30px rgba(0, 242, 255, 0.4)",
            }}
          >
            <Mail size={18} />
            Contact the Founder
            <ArrowRight size={18} />
          </motion.a>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center pt-12 border-t"
          style={{ borderColor: "rgba(255,255,255,0.1)" }}
        >
          <p
            className="text-sm"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            © 2026 Enosx Technologies. ENOSX AI is online.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
