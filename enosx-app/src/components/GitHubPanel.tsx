/**
 * GitHubPanel — Enhanced GitHub integration panel.
 * Features: multi-account management, repo/branch selector, file browser,
 * AI-powered file editing, and direct push to GitHub via REST API.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Github, FolderOpen, FileText, Upload, ChevronRight, Code,
  Plus, RefreshCw, GitBranch, ChevronDown, Check,
  Sparkles, Lock, Unlock, User, LogOut,
  Loader2, AlertCircle, CheckCircle2, FolderClosed,
  ChevronLeft,
} from 'lucide-react';
import { useGitHub, GitHubRepo, GitHubFile } from '../hooks/useGitHub';
import { useTheme } from '../contexts/ThemeContext';
import { useWallpaper } from '../contexts/WallpaperContext';

interface GitHubPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type PanelView = 'accounts' | 'repos' | 'files' | 'editor';

export default function GitHubPanel({ isOpen, onClose }: GitHubPanelProps) {
  const { config } = useTheme();
  const { settings } = useWallpaper();
  const {
    accounts, activeAccount, repos, currentRepo, branches,
    files, currentFile, isLoading, error,
    connectWithOAuth, removeAccount, switchAccount,
    fetchRepos, addRepoByName, selectRepo, selectBranch,
    browseDirectory, selectFile, updateFileContent, pushChanges, createFile,
  } = useGitHub();

  const [view, setView] = useState<PanelView>('accounts');
  const [isConnecting, setIsConnecting] = useState(false);
  const [repoInput, setRepoInput] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [pushStatus, setPushStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [pathStack, setPathStack] = useState<string[]>([]);
  const [newFilePath, setNewFilePath] = useState('');
  const [showNewFile, setShowNewFile] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (activeAccount && accounts.length > 0 && view === 'accounts') {
      setView('repos');
      fetchRepos();
    }
  }, []);

  useEffect(() => {
    if (currentFile) setView('editor');
  }, [currentFile]);

  const handleConnect = async () => {
    setIsConnecting(true);
    const ok = await connectWithOAuth();
    setIsConnecting(false);
    if (ok) { setView('repos'); fetchRepos(); }
  };

  const handleSelectRepo = async (repo: GitHubRepo) => {
    await selectRepo(repo);
    setView('files');
    setPathStack([]);
  };

  const handleAddRepo = async () => {
    if (!repoInput.trim()) return;
    await addRepoByName(repoInput.trim());
    setRepoInput('');
  };

  const handleBrowse = async (file: GitHubFile) => {
    if (file.type === 'dir') {
      setPathStack(prev => [...prev, file.path]);
      await browseDirectory(file.path);
    } else {
      await selectFile(file);
    }
  };

  const handleBack = async () => {
    if (view === 'editor') { setView('files'); return; }
    if (view === 'files') {
      if (pathStack.length > 0) {
        const newStack = pathStack.slice(0, -1);
        setPathStack(newStack);
        if (newStack.length > 0) await browseDirectory(newStack[newStack.length - 1]);
        else if (currentRepo) await selectRepo(currentRepo);
      } else { setView('repos'); }
      return;
    }
    if (view === 'repos') { setView('accounts'); return; }
  };

  const handleAiEdit = async () => {
    if (!aiPrompt.trim() || !currentFile) return;
    setIsAiLoading(true);
    try {
      const apiBase = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1';
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
      const res = await fetch(`${apiBase}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an expert code editor. Return ONLY the modified file content, no explanations, no markdown code blocks.' },
            { role: 'user', content: `File: ${currentFile.path}\n\nContent:\n${currentFile.content}\n\nInstructions: ${aiPrompt}` },
          ],
        }),
      });
      if (!res.ok) throw new Error('AI request failed');
      const data = await res.json();
      const newContent = data.choices?.[0]?.message?.content ?? '';
      if (newContent) { updateFileContent(newContent); setAiPrompt(''); }
    } catch (err) { console.error('AI edit error:', err); }
    finally { setIsAiLoading(false); }
  };

  const handlePush = async () => {
    if (!commitMessage.trim()) return;
    setPushStatus('idle');
    const ok = await pushChanges(commitMessage);
    setPushStatus(ok ? 'success' : 'error');
    if (ok) { setCommitMessage(''); setTimeout(() => setPushStatus('idle'), 3000); }
  };

  const handleCreateFile = async () => {
    if (!newFilePath.trim()) return;
    const ok = await createFile(newFilePath.trim(), '', `Create ${newFilePath.trim()}`);
    if (ok) { setNewFilePath(''); setShowNewFile(false); if (currentRepo) await selectRepo(currentRepo); }
  };

  const accentRgb = config.accentRgb;
  const accentColor = config.accent;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
          />
          <motion.div
            initial={{ x: 420, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 420, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            className="fixed right-0 top-0 h-screen flex flex-col z-50"
            style={{
              width: 400,
              background: `rgba(10,10,16,${settings.panelOpacity * 0.98})`,
              backdropFilter: `blur(${settings.blurAmount}px)`,
              WebkitBackdropFilter: `blur(${settings.blurAmount}px)`,
              borderLeft: `1px solid rgba(${accentRgb},0.15)`,
              boxShadow: `-12px 0 50px rgba(0,0,0,0.6)`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
              <div className="flex items-center gap-2">
                {view !== 'accounts' && (
                  <button onClick={handleBack} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10 mr-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <ChevronLeft size={15} />
                  </button>
                )}
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `rgba(${accentRgb},0.15)` }}>
                  <Github size={14} style={{ color: accentColor }} />
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    GitHub{view === 'repos' && activeAccount ? ` — ${activeAccount.username}` : ''}{view === 'files' && currentRepo ? ` — ${currentRepo.name}` : ''}{view === 'editor' && currentFile ? ` — ${currentFile.name}` : ''}
                  </div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {view === 'accounts' ? 'Manage accounts' : view === 'repos' ? 'Select repository' : view === 'files' ? 'Browse files' : 'AI-powered editor'}
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <X size={15} />
              </button>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="px-4 py-2 flex items-center gap-2 text-xs"
                  style={{ background: 'rgba(220,20,60,0.12)', borderBottom: '1px solid rgba(220,20,60,0.2)', color: '#ff6b8a' }}>
                  <AlertCircle size={12} />{error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

              {/* ACCOUNTS */}
              {view === 'accounts' && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>GITHUB ACCOUNTS</span>
                    <button onClick={handleConnect} disabled={isConnecting}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all hover:bg-white/10"
                      style={{ color: accentColor, border: `1px solid rgba(${accentRgb},0.25)` }}>
                      {isConnecting ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}Connect Account
                    </button>
                  </div>

                  {accounts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center space-y-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      <Github size={32} style={{ opacity: 0.3 }} />
                      <div className="text-sm">No accounts connected</div>
                      <div className="text-xs">Connect securely with GitHub OAuth to get started</div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {accounts.map(account => (
                        <motion.div key={account.id} whileHover={{ scale: 1.01 }}
                          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                          style={{
                            background: activeAccount?.id === account.id ? `rgba(${accentRgb},0.12)` : 'rgba(255,255,255,0.04)',
                            border: activeAccount?.id === account.id ? `1px solid rgba(${accentRgb},0.3)` : '1px solid rgba(255,255,255,0.07)',
                          }}
                          onClick={() => { switchAccount(account.id); setView('repos'); fetchRepos(); }}>
                          {account.avatarUrl
                            ? <img src={account.avatarUrl} alt={account.username} className="w-8 h-8 rounded-full" />
                            : <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `rgba(${accentRgb},0.2)` }}><User size={14} style={{ color: accentColor }} /></div>}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>@{account.username}</div>
                            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{activeAccount?.id === account.id ? '● Active' : 'Click to switch'}</div>
                          </div>
                          <button onClick={e => { e.stopPropagation(); removeAccount(account.id); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-red-500/20" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            <LogOut size={13} />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {accounts.length > 0 && (
                    <button onClick={() => { setView('repos'); fetchRepos(); }}
                      className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{ background: `rgba(${accentRgb},0.15)`, border: `1px solid rgba(${accentRgb},0.3)`, color: accentColor }}>
                      Browse Repositories →
                    </button>
                  )}
                </>
              )}

              {/* REPOS */}
              {view === 'repos' && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>REPOSITORIES</span>
                    <button onClick={fetchRepos} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {isLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={repoInput} onChange={e => setRepoInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddRepo()}
                      placeholder="owner/repo-name"
                      className="flex-1 px-3 py-2 rounded-xl text-xs outline-none font-mono"
                      style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(${accentRgb},0.15)`, color: 'rgba(255,255,255,0.8)' }} />
                    <button onClick={handleAddRepo} className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
                      style={{ background: `rgba(${accentRgb},0.15)`, color: accentColor, border: `1px solid rgba(${accentRgb},0.25)` }}>
                      <Plus size={13} />
                    </button>
                  </div>

                  {isLoading && repos.length === 0
                    ? <div className="flex items-center justify-center py-10"><Loader2 size={24} className="animate-spin" style={{ color: accentColor }} /></div>
                    : repos.length === 0
                    ? <div className="text-center py-8 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>No repositories found. Click refresh or add one above.</div>
                    : (
                      <div className="space-y-1.5">
                        {repos.map(repo => (
                          <motion.button key={repo.fullName} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                            onClick={() => handleSelectRepo(repo)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                            style={{
                              background: currentRepo?.fullName === repo.fullName ? `rgba(${accentRgb},0.12)` : 'rgba(255,255,255,0.04)',
                              border: currentRepo?.fullName === repo.fullName ? `1px solid rgba(${accentRgb},0.3)` : '1px solid rgba(255,255,255,0.06)',
                            }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `rgba(${accentRgb},0.1)` }}>
                              {repo.private ? <Lock size={13} style={{ color: accentColor }} /> : <Unlock size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>{repo.name}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {repo.language && <span className="text-xs" style={{ color: accentColor }}>{repo.language}</span>}
                                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{repo.defaultBranch}</span>
                              </div>
                            </div>
                            <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                          </motion.button>
                        ))}
                      </div>
                    )}
                </>
              )}

              {/* FILES */}
              {view === 'files' && currentRepo && (
                <>
                  {/* Branch selector */}
                  <div className="relative">
                    <button onClick={() => setShowBranchMenu(v => !v)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(${accentRgb},0.15)`, color: 'rgba(255,255,255,0.7)' }}>
                      <GitBranch size={12} style={{ color: accentColor }} />
                      <span className="flex-1 text-left font-mono">{currentRepo.branch}</span>
                      <ChevronDown size={12} />
                    </button>
                    <AnimatePresence>
                      {showBranchMenu && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                          className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10"
                          style={{ background: 'rgba(18,18,26,0.98)', border: `1px solid rgba(${accentRgb},0.2)`, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                          {branches.map(b => (
                            <button key={b.name} onClick={() => { selectBranch(b.name); setShowBranchMenu(false); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-all hover:bg-white/10"
                              style={{ color: b.name === currentRepo.branch ? accentColor : 'rgba(255,255,255,0.7)' }}>
                              {b.name === currentRepo.branch && <Check size={11} />}
                              <span className="font-mono">{b.name}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Breadcrumb */}
                  {pathStack.length > 0 && (
                    <div className="flex items-center gap-1 text-xs flex-wrap" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      <button onClick={() => { setPathStack([]); if (currentRepo) selectRepo(currentRepo); }} className="hover:text-white transition-colors">root</button>
                      {pathStack.map((p, i) => (
                        <React.Fragment key={p}>
                          <ChevronRight size={10} />
                          <button onClick={() => { const ns = pathStack.slice(0, i + 1); setPathStack(ns); browseDirectory(p); }}
                            className="hover:text-white transition-colors truncate max-w-[80px]">{p.split('/').pop()}</button>
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>FILES</span>
                    <button onClick={() => setShowNewFile(v => !v)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      <Plus size={13} />
                    </button>
                  </div>

                  <AnimatePresence>
                    {showNewFile && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="flex gap-2 mb-2">
                          <input type="text" value={newFilePath} onChange={e => setNewFilePath(e.target.value)} placeholder="path/to/new-file.ts"
                            className="flex-1 px-3 py-2 rounded-lg text-xs outline-none font-mono"
                            style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(${accentRgb},0.2)`, color: 'rgba(255,255,255,0.9)' }} />
                          <button onClick={handleCreateFile} className="px-3 py-2 rounded-lg text-xs font-medium" style={{ background: `rgba(${accentRgb},0.2)`, color: accentColor }}>Create</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isLoading
                    ? <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: accentColor }} /></div>
                    : (
                      <div className="space-y-1">
                        {files.map(file => (
                          <motion.button key={file.path} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                            onClick={() => handleBrowse(file)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all hover:bg-white/10"
                            style={{ color: 'rgba(255,255,255,0.75)' }}>
                            {file.type === 'dir'
                              ? <FolderClosed size={14} style={{ color: accentColor, flexShrink: 0 }} />
                              : <FileText size={14} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />}
                            <span className="text-xs font-mono truncate flex-1">{file.name}</span>
                            {file.type === 'dir' && <ChevronRight size={12} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />}
                            {file.size !== undefined && file.type === 'file' && (
                              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                                {file.size > 1024 ? `${(file.size / 1024).toFixed(1)}k` : `${file.size}b`}
                              </span>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    )}
                </>
              )}

              {/* EDITOR */}
              {view === 'editor' && currentFile && (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: `rgba(${accentRgb},0.07)`, border: `1px solid rgba(${accentRgb},0.15)` }}>
                    <Code size={13} style={{ color: accentColor }} />
                    <span className="text-xs font-mono flex-1 truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{currentFile.path}</span>
                  </div>

                  {/* AI Assistant */}
                  <div className="space-y-2 p-3 rounded-xl" style={{ background: `rgba(${accentRgb},0.06)`, border: `1px solid rgba(${accentRgb},0.15)` }}>
                    <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: accentColor }}>
                      <Sparkles size={12} />AI Edit Assistant
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAiEdit()}
                        placeholder="e.g. Add error handling, refactor this function..."
                        className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(${accentRgb},0.2)`, color: 'rgba(255,255,255,0.9)' }} />
                      <button onClick={handleAiEdit} disabled={isAiLoading || !aiPrompt.trim()}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
                        style={{ background: `rgba(${accentRgb},0.2)`, color: accentColor, opacity: isAiLoading || !aiPrompt.trim() ? 0.5 : 1 }}>
                        {isAiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Editor */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>EDITOR</span>
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>{currentFile.content?.split('\n').length ?? 0} lines</span>
                    </div>
                    <textarea ref={editorRef} value={currentFile.content ?? ''} onChange={e => updateFileContent(e.target.value)}
                      className="w-full rounded-xl text-xs font-mono outline-none resize-none"
                      style={{ height: 260, background: 'rgba(0,0,0,0.4)', border: `1px solid rgba(${accentRgb},0.15)`, color: 'rgba(255,255,255,0.85)', padding: '12px', lineHeight: 1.6 }}
                      spellCheck={false} />
                  </div>

                  {/* Commit & Push */}
                  <div className="space-y-2">
                    <input type="text" value={commitMessage} onChange={e => setCommitMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handlePush()}
                      placeholder="Commit message..."
                      className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(${accentRgb},0.2)`, color: 'rgba(255,255,255,0.9)' }} />
                    <button onClick={handlePush} disabled={isLoading || !commitMessage.trim()}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: pushStatus === 'success' ? 'rgba(34,197,94,0.2)' : pushStatus === 'error' ? 'rgba(220,20,60,0.2)' : `rgba(${accentRgb},0.18)`,
                        border: pushStatus === 'success' ? '1px solid rgba(34,197,94,0.4)' : pushStatus === 'error' ? '1px solid rgba(220,20,60,0.4)' : `1px solid rgba(${accentRgb},0.35)`,
                        color: pushStatus === 'success' ? '#4ade80' : pushStatus === 'error' ? '#ff6b8a' : accentColor,
                        opacity: isLoading || !commitMessage.trim() ? 0.6 : 1,
                      }}>
                      {isLoading ? <Loader2 size={14} className="animate-spin" />
                        : pushStatus === 'success' ? <><CheckCircle2 size={14} /> Pushed Successfully!</>
                        : pushStatus === 'error' ? <><AlertCircle size={14} /> Push Failed</>
                        : <><Upload size={14} /> Push to {currentRepo?.branch ?? 'main'}</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
