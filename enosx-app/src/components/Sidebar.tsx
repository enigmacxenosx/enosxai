/*
 * ENOSX AI — Sidebar
 * Clean command-center sidebar with focused navigation, function shortcuts, and conversation history.
 * - EX logo toggles sidebar expand/shrink
 * - New Chat uses notepad+pen icon
 * - Settings icon removed
 * - Profile icon pinned to bottom
 * - Library (Chat History) icon
 */

import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  MessageSquare,
  Crown,
  Info,
  X,
  User,
  NotebookPen,
  BookOpen,
  Library,
} from "lucide-react";
import { Conversation } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";
import BrandMark from "./BrandMark";
import { useWallpaper } from "@/contexts/WallpaperContext";
import { useAuth } from "@/contexts/AuthContext";

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
  onScreenGuiderClick?: () => void;
  isPro?: boolean;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  collapsed = true,
  onToggle,
  onSettingsClick,
  onGitHubClick,
  onProfileClick,
  onLibraryClick,
  onScreenGuiderClick,
  isPro = false,
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const { config } = useTheme();
  const { settings } = useWallpaper();
  const { user, isAuthenticated } = useAuth();

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
      label: "Chat History",
      description: "Browse past conversations",
      icon: BookOpen,
      onClick: onLibraryClick || (() => {}),
      accent: false,
      danger: false,
    },
    {
      label: "Media Library",
      description: "Your files, folders, and playlists",
      icon: Library,
      onClick: () => { window.location.href = "/media-library"; },
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
    <motion.aside
      initial={false}
      animate={{ width: isMobileOpen ? 280 : collapsed ? 64 : 280 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="neon-dashboard-sidebar relative flex-shrink-0 flex flex-col h-full overflow-hidden"
      style={{
        background: `linear-gradient(180deg, rgba(7,8,12,${settings.panelOpacity * 0.96}) 0%, rgba(12,12,18,${settings.panelOpacity * 0.9}) 100%)`,
        backdropFilter: `blur(${settings.blurAmount}px)`,
        WebkitBackdropFilter: `blur(${settings.blurAmount}px)`,
        borderRight: `1px solid rgba(${config.accentRgb}, 0.14)`,
        boxShadow: `inset -1px 0 0 rgba(${config.accentRgb}, 0.06), 18px 0 50px rgba(0,0,0,0.22)`,
      }}
    >
      {/* Logo header — clicking EX logo toggles sidebar */}
      <div
        className="flex items-center px-3 py-4 flex-shrink-0 relative"
        style={{ borderBottom: `1px solid rgba(${config.accentRgb}, 0.08)`, minHeight: 72 }}
      >
        <div className={`flex items-center gap-3 ${collapsed ? 'mx-auto' : 'px-2'}`}>
          {/* EX logo button — toggles sidebar expand/collapse */}
          <motion.button
            whileHover={{ scale: 1.08, boxShadow: `0 0 22px rgba(${config.accentRgb}, 0.7)` }}
            whileTap={{ scale: 0.94 }}
            onClick={onToggle}
            className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden cursor-pointer select-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              boxShadow: '0 0 15px rgba(124,111,247,0.2)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
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
              className={`neon-dashboard-nav w-full flex items-center ${collapsed ? 'justify-center' : 'justify-start px-4'} py-2.5 rounded-lg transition-all duration-200 gap-3`}
              style={{
                background: item.accent
                  ? `linear-gradient(135deg, rgba(${config.accentRgb}, 0.18), rgba(${config.accentRgb}, 0.07))`
                  : item.danger
                  ? "linear-gradient(135deg, rgba(220,20,60,0.13), rgba(220,20,60,0.04))"
                  : "rgba(255,255,255,0.035)",
                border: item.accent
                  ? `1px solid rgba(${config.accentRgb}, 0.26)`
                  : item.danger
                  ? "1px solid rgba(220,20,60,0.22)"
                  : "1px solid rgba(255,255,255,0.06)",
                color: item.accent ? config.accent : item.danger ? "#ff6b8a" : config.text,
              }}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={16} className="flex-shrink-0" />
              {!collapsed && (
                <div className="flex flex-col items-start overflow-hidden flex-1">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-semibold whitespace-nowrap">{item.label}</span>
                  </div>
                  <span className="text-[10px] opacity-60 whitespace-nowrap">{item.description}</span>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Conversation history */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-2 space-y-1 scrollbar-thin">
        <AnimatePresence initial={false}>
          {conversations.map((conv, i) => (
            <motion.div
              key={conv.id}
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
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-start px-4'} py-2.5 rounded-xl text-left transition-all duration-200 gap-3`}
                style={
                  activeId === conv.id
                    ? {
                        background: `rgba(${config.accentRgb}, 0.14)`,
                        border: `1px solid rgba(${config.accentRgb}, 0.28)`,
                        color: config.text,
                        boxShadow: `0 0 12px rgba(${config.accentRgb}, 0.1)`,
                      }
                    : {
                        background: "transparent",
                        border: "1px solid transparent",
                        color: config.textMuted,
                      }
                }
                title={collapsed ? conv.title : undefined}
              >
                <MessageSquare
                  size={13}
                  style={{ color: activeId === conv.id ? config.accent : config.textMuted, flexShrink: 0 }}
                />
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  aria-label={`Delete ${conv.title}`}
                >
                  <Trash2 size={12} />
                </motion.button>
              )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Profile button — pinned to bottom */}
      <div className="flex-shrink-0 px-2.5 py-3 border-t" style={{ borderColor: `rgba(${config.accentRgb}, 0.08)` }}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onProfileClick}
          className={`neon-dashboard-profile w-full flex items-center ${collapsed ? 'justify-center' : 'justify-start px-3'} py-2.5 rounded-xl transition-all duration-200 gap-3`}
          style={{
            background: `rgba(${config.accentRgb}, 0.07)`,
            border: `1px solid rgba(${config.accentRgb}, 0.18)`,
          }}
          title={collapsed ? (isAuthenticated ? user?.displayName ?? 'Profile' : 'Sign In') : undefined}
        >
          {isAuthenticated && user?.avatarUrl
            ? <img src={user.avatarUrl} alt={user.displayName} className="w-6 h-6 rounded-full flex-shrink-0 object-cover" />
            : (
              <div
                className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                style={{ background: `rgba(${config.accentRgb}, 0.2)`, color: config.accent }}
              >
                {isAuthenticated && user?.displayName ? user.displayName.charAt(0).toUpperCase() : <User size={13} />}
              </div>
            )
          }
          {!collapsed && (
            <div className="flex flex-col items-start overflow-hidden">
              <span className="text-sm font-semibold whitespace-nowrap" style={{ color: config.text }}>
                {isAuthenticated ? user?.displayName ?? 'Profile' : 'Sign In'}
              </span>
              <span className="text-[10px] whitespace-nowrap truncate max-w-[160px]" style={{ color: config.textMuted }}>
                {isAuthenticated ? user?.email : 'Account & preferences'}
              </span>
            </div>
          )}
        </motion.button>
      </div>
    </motion.aside>
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
              onClick={onMobileClose}
              className="absolute top-4 right-3 z-50 w-8 h-8 rounded-full flex items-center justify-center border transition-all"
              style={{
                background: "rgba(0,0,0,0.5)",
                borderColor: `rgba(${config.accentRgb}, 0.2)`,
                color: config.textMuted,
              }}
            >
              <X size={14} />
            </button>
            {sidebarContent}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return sidebarContent;
}
