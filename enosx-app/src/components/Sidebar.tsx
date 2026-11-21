/*
 * ENOSX AI — Sidebar
 * Clean command-center sidebar with focused navigation, function shortcuts, and conversation history.
 * - EX logo toggles sidebar expand/shrink
 * - New Chat uses notepad+pen icon
 * - Settings and plugin actions are available in the navigation
 * - Profile icon pinned to bottom
 * - Library (Chat History) icon
 */

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Trash2,
  MessageSquare,
  Crown,
  BriefcaseBusiness,
  Code2,
  GraduationCap,
  MapPin,
  Palette,
  Search as SearchIcon,
  Info,
  X,
  User,
  NotebookPen,
  Search,
  Library,
  FolderKanban,
  BarChart3,
  Settings,
  Puzzle,
} from "lucide-react";
import { Conversation } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";
import BrandMark from "./BrandMark";
import { useWallpaper } from "@/contexts/WallpaperContext";
import { useAuth } from "@/contexts/AuthContext";
import PluginsDialog from "./PluginsDialog";
import ThemeSwitcher from "./ThemeSwitcher";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  collapsed?: boolean;
  onToggle?: () => void;
  onSettingsClick?: () => void;
  onGitHubClick?: () => void;
  onProfileClick?: () => void;
  onLibraryClick?: () => void;
  onPluginsClick?: () => void;
  onScreenGuiderClick?: () => void;
  isPro?: boolean;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

function getConversationIcon(conversation: Conversation) {
  if (/^GOD MODE\b/i.test(conversation.title)) return Crown;
  const firstUserMessage = conversation.messages.find((message) => message.role === "user")?.content || "";
  const topic = `${conversation.title} ${firstUserMessage}`.toLocaleLowerCase();
  if (/\b(code|coding|program|software|website|web app|api|bug|script|developer|debug)\b/.test(topic)) return Code2;
  if (/\b(business|company|startup|marketing|sales|customer|client|strategy|finance|brand)\b/.test(topic)) return BriefcaseBusiness;
  if (/\b(learn|lesson|study|school|teach|tutorial|explain|course|homework)\b/.test(topic)) return GraduationCap;
  if (/\b(travel|trip|flight|hotel|itinerary|vacation|visit)\b/.test(topic)) return MapPin;
  if (/\b(image|logo|design|draw|illustration|artwork|creative|poster|visual)\b/.test(topic)) return Palette;
  if (/\b(research|compare|summarize|summary|analyze|analysis|find|search|review)\b/.test(topic)) return SearchIcon;
  return MessageSquare;
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  collapsed = false,
  onToggle,
  onSettingsClick,
  onGitHubClick,
  onProfileClick,
  onLibraryClick,
  onPluginsClick,
  onScreenGuiderClick,
  isPro = false,
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const [showPlugins, setShowPlugins] = useState(false);
  const { config } = useTheme();
  const { settings } = useWallpaper();
  const { user, isAuthenticated } = useAuth();

  const conversationSection = (conversation: Conversation) => {
    const date = new Date(conversation.updatedAt || conversation.createdAt);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const conversationDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const daysAgo = Math.round((today.getTime() - conversationDay.getTime()) / 86400000);
    if (daysAgo <= 0) return "Today";
    if (daysAgo === 1) return "Yesterday";
    return "Older";
  };

  const navItems = [
    {
      label: "New Chat",
      description: "Start a fresh workspace",
      icon: NotebookPen,
      onClick: onNew,
      accent: true,
      danger: false,
    },
    {
      label: "Search",
      description: "Find past conversations",
      icon: Search,
      onClick: onLibraryClick || (() => {}),
      accent: false,
      danger: false,
    },
    {
      label: "Library",
      description: "Your files, folders, and playlists",
      icon: Library,
      onClick: () => { window.location.href = "/media-library"; },
      accent: false,
      danger: false,
    },
    {
      label: "Projects",
      description: "Your project workspace",
      icon: FolderKanban,
      onClick: () => { window.location.href = "/projects"; },
      accent: false,
      danger: false,
    },
    {
      label: "Visual Story Studio",
      description: "Turn data into an animated narrative",
      icon: BarChart3,
      onClick: () => { window.location.href = "/visual-story"; },
      accent: false,
      danger: false,
    },
    {
      label: "Plugins & Skills",
      description: "Manage AI plugins and skills",
      icon: Puzzle,
      onClick: onPluginsClick || (() => setShowPlugins(true)),
      accent: false,
      danger: false,
    },
    {
      label: "Settings",
      description: "Account and workspace preferences",
      icon: Settings,
      onClick: onSettingsClick || (() => {}),
      accent: false,
      danger: false,
    },
    {
      label: "About ENOSX",
      description: "Vision, stack, and founder",
      icon: Info,
      onClick: () => { window.location.href = "/about"; },
      accent: false,
      danger: false,
    },
  ];

  const sidebarContent = (
    <>
      <motion.aside
      initial={false}
      animate={{ width: isMobileOpen ? 280 : collapsed ? 64 : 280 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="neon-dashboard-sidebar relative flex-shrink-0 flex flex-col h-full overflow-hidden"
        style={{
        background: `linear-gradient(180deg, rgba(${config.isDark ? "10,10,15" : "255,255,255"},${settings.panelOpacity * 0.98}) 0%, rgba(${config.isDark ? "12,12,18" : "248,250,255"},${settings.panelOpacity * 0.94}) 100%)`,
        backdropFilter: `blur(${settings.blurAmount}px)`,
        WebkitBackdropFilter: `blur(${settings.blurAmount}px)`,
        borderRight: `1px solid ${config.border}`,
        boxShadow: config.isDark ? "18px 0 50px rgba(0,0,0,0.18)" : "18px 0 50px rgba(33,43,68,0.08)",
      }}
    >
      {/* Logo header — clicking the brand mark toggles sidebar */}
      <div
        className="flex items-center px-3 py-4 flex-shrink-0 relative"
        style={{ borderBottom: "none", minHeight: 72 }}
      >
        <div className={`flex items-center gap-3 ${collapsed ? 'mx-auto' : 'px-2'}`}>
          {/* Brand mark button — toggles sidebar expand/collapse */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            onClick={onToggle}
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center overflow-visible cursor-pointer select-none"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <BrandMark size={32} />
          </motion.button>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-bold text-lg tracking-tight"
              style={{ color: config.text }}
            >
              ENOSX AI
            </motion.span>
          )}
        </div>
        {!collapsed && <div className="ml-auto"><ThemeSwitcher /></div>}
      </div>

      {/* Nav items */}
      <div className="px-2.5 py-3 flex-shrink-0 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.label}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={item.onClick}
              className={`neon-dashboard-nav w-full flex items-center ${collapsed ? 'justify-center' : 'justify-start px-3'} py-2.5 rounded-[10px] transition-all duration-200 gap-3`}
              style={{
                background: item.accent
                  ? `linear-gradient(135deg, rgba(${config.accentRgb}, 0.18), rgba(${config.accentRgb}, 0.09))`
                  : item.danger
                  ? "linear-gradient(135deg, rgba(220,20,60,0.13), rgba(220,20,60,0.04))"
                  : "transparent",
                border: "none",
                color: item.accent ? config.accent : item.danger ? "#ff6b8a" : config.textMuted,
              }}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={16} strokeWidth={1.8} className="flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Conversation history */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-2 space-y-1 scrollbar-thin">
        <AnimatePresence initial={false}>
          {conversations.map((conv, i) => {
            const isGodModeConversation = /^GOD MODE\b/i.test(conv.title);
            const ConversationIcon = getConversationIcon(conv);
            const isWorking = conv.messages.some((message) => message.role === "assistant" && message.isStreaming);
            const modeAccent = isGodModeConversation ? "#fbbf24" : config.accent;
            const section = conversationSection(conv);
            const previousSection = i > 0 ? conversationSection(conversations[i - 1]) : null;
            return (
            <div key={conv.id}>
              {!collapsed && section !== previousSection && (
                <div className="px-2 pb-1 pt-4 text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: config.textMuted, opacity: 0.65 }}>{section}</div>
              )}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
                className="group relative"
              >
                <div className={`relative w-full flex items-center ${collapsed ? 'justify-center' : 'justify-start'} rounded-xl transition-all duration-200`}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(conv.id)}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-start px-4 pr-9'} py-2.5 rounded-xl text-left transition-all duration-200 gap-3`}
                style={
                  activeId === conv.id
                    ? {
                        background: isGodModeConversation ? "rgba(251,191,36,0.12)" : `rgba(${config.accentRgb}, 0.14)`,
                        border: "none",
                        color: config.text,
                        boxShadow: "none",
                      }
                    : {
                        background: "transparent",
                        border: "none",
                        color: config.textMuted,
                      }
                }
                title={collapsed ? conv.title : undefined}
              >
                <span className="relative flex-shrink-0">
                  <ConversationIcon
                    size={14}
                    style={{ color: activeId === conv.id || isGodModeConversation ? modeAccent : config.textMuted }}
                  />
                  {isWorking && (
                    <span
                      role="status"
                      aria-label="AI is working on this chat"
                      title="AI is working on this chat"
                      className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-sky-400 ring-2 ring-[#0a0a0f]"
                    />
                  )}
                </span>
                {!collapsed && (
                  <span className="text-sm truncate flex-1">
                    {conv.title}
                  </span>
                )}
              </motion.button>
              {!collapsed && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.2, color: "#ff6b8a" }}
                  onClick={() => onDelete(conv.id)}
                  title={`Delete ${conv.title}`}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-white/60 transition-opacity hover:bg-white/10 hover:text-rose-300 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                  aria-label={`Delete ${conv.title}`}
                >
                  <Trash2 size={12} />
                </motion.button>
              )}
                </div>
              </motion.div>
            </div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Profile button — pinned to bottom */}
      <div className="flex-shrink-0 px-2.5 py-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onProfileClick}
          className={`neon-dashboard-profile w-full flex items-center ${collapsed ? 'justify-center' : 'justify-start px-3'} py-2.5 rounded-xl transition-all duration-200 gap-3`}
          style={{
            background: `rgba(${config.accentRgb}, 0.07)`,
            border: "none",
          }}
          title={collapsed ? (isAuthenticated ? user?.displayName ?? 'Profile' : 'Profile') : undefined}
        >
          {isAuthenticated && user?.avatarUrl
            ? <img src={user.avatarUrl} alt={user.displayName} className="w-6 h-6 rounded-full flex-shrink-0 object-cover" />
            : (
              <div
                className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                style={{ background: `rgba(${config.accentRgb}, 0.2)`, color: config.accent }}
              >
                {isAuthenticated && user?.displayName ? user.displayName.charAt(0).toUpperCase() : <User size={10} />}
              </div>
            )
          }
          {!collapsed && (
            <div className="flex flex-col items-start overflow-hidden">
              <span className="text-base font-semibold whitespace-nowrap" style={{ color: config.text }}>
                {isAuthenticated ? user?.displayName ?? 'Profile' : 'Profile'}
              </span>
              <span className="text-[10px] whitespace-nowrap truncate max-w-[160px]" style={{ color: config.textMuted }}>
                {isAuthenticated ? user?.email : 'Guest mode · Account & preferences'}
              </span>
            </div>
          )}
        </motion.button>
      </div>
    </motion.aside>
    <PluginsDialog open={showPlugins} onClose={() => setShowPlugins(false)} />
    </>
  );

  if (isMobileOpen) {
    return (
      <AnimatePresence>
        <motion.div
          key="mobile-sidebar-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex"
          onClick={onMobileClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            key="mobile-sidebar-panel"
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="relative h-full w-72 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onMobileClose}
              className="absolute top-4 right-3 z-50 w-8 h-8 rounded-full flex items-center justify-center border transition-all"
              style={{
                background: "rgba(0,0,0,0.5)",
                borderColor: `rgba(${config.accentRgb}, 0.2)`,
                color: config.textMuted,
              }}
              aria-label="Close sidebar"
              title="Close sidebar"
            >
              <X size={12} />
            </button>
            {sidebarContent}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return sidebarContent;
}
