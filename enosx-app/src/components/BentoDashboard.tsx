/*
 * ENOSX AI — BentoDashboard
 * Glassmorphism bento grid showing AI insights and stats
 * Features: token usage, conversation summary, quick actions, theme-aware
 */

import { motion } from "framer-motion";
import { BarChart3, Zap, MessageSquare, Clock, TrendingUp } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Conversation } from "@/lib/types";

interface BentoDashboardProps {
  conversations: Conversation[];
  activeConversation: Conversation | null;
}

export default function BentoDashboard({
  conversations,
  activeConversation,
}: BentoDashboardProps) {
  const { config } = useTheme();

  // Calculate stats
  const totalMessages = conversations.reduce(
    (sum, conv) => sum + conv.messages.length,
    0
  );
  const totalConversations = conversations.length;
  const avgMessagesPerConv =
    totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0;
  const estimatedTokens = Math.round(totalMessages * 75); // Rough estimate

  const bento = [
    {
      title: "Total Messages",
      value: totalMessages,
      icon: MessageSquare,
      size: "col-span-1 row-span-1",
      color: "rgba(59, 130, 246, 0.1)",
      accentColor: "#3b82f6",
    },
    {
      title: "Conversations",
      value: totalConversations,
      icon: Zap,
      size: "col-span-1 row-span-1",
      color: "rgba(220, 20, 60, 0.1)",
      accentColor: "#dc143c",
    },
    {
      title: "Avg Msg/Conv",
      value: avgMessagesPerConv,
      icon: BarChart3,
      size: "col-span-1 row-span-1",
      color: "rgba(34, 197, 94, 0.1)",
      accentColor: "#22c55e",
    },
    {
      title: "Est. Tokens",
      value: estimatedTokens.toLocaleString(),
      icon: TrendingUp,
      size: "col-span-1 row-span-1",
      color: "rgba(168, 85, 247, 0.1)",
      accentColor: "#a855f7",
    },
    {
      title: "Active Chat",
      value: activeConversation?.title ?? "None",
      subtitle: `${activeConversation?.messages.length ?? 0} messages`,
      icon: Clock,
      size: "col-span-2 row-span-1",
      color: "rgba(0, 242, 255, 0.1)",
      accentColor: "#00f2ff",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2
          className="text-xl font-bold mb-1"
          style={{ color: config.text, letterSpacing: "-0.02em" }}
        >
          AI Insights
        </h2>
        <p style={{ color: config.textMuted, fontSize: "13px" }}>
          Your conversation analytics at a glance
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-2 gap-3">
        {bento.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className={`${item.size} rounded-2xl p-4 relative overflow-hidden group cursor-pointer`}
            style={{
              background: item.color,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: `1px solid rgba(${config.accentRgb}, 0.1)`,
              transition: "all 0.3s ease",
            }}
            whileHover={{
              scale: 1.02,
              boxShadow: `0 8px 24px rgba(${config.accentRgb}, 0.15)`,
            }}
          >
            {/* Glow effect on hover */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${item.accentColor}15 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />

            {/* Content */}
            <div className="relative z-1 flex items-start justify-between">
              <div>
                <p
                  className="text-xs mb-2"
                  style={{
                    color: config.textMuted,
                    letterSpacing: "0.06em",
                    fontWeight: 600,
                  }}
                >
                  {item.title}
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: item.accentColor }}
                >
                  {item.value}
                </p>
                {item.subtitle && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: config.textMuted }}
                  >
                    {item.subtitle}
                  </p>
                )}
              </div>
              <item.icon
                size={20}
                style={{
                  color: item.accentColor,
                  opacity: 0.6,
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Conversations */}
      <div>
        <h3
          className="text-sm font-semibold mb-3"
          style={{ color: config.text, letterSpacing: "-0.01em" }}
        >
          Recent Conversations
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {conversations.slice(0, 5).map((conv, i) => (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-3 rounded-lg"
              style={{
                background: `rgba(${config.accentRgb}, 0.05)`,
                border: `1px solid rgba(${config.accentRgb}, 0.1)`,
              }}
            >
              <p
                className="text-sm truncate"
                style={{ color: config.text, fontWeight: 500 }}
              >
                {conv.title}
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: config.textMuted }}
              >
                {conv.messages.length} messages •{" "}
                {new Date(conv.updatedAt).toLocaleDateString()}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
