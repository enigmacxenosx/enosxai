import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FolderPlus, HardDrive, ListMusic, Music2, Play, Search, Trash2, Upload, Video, Image as ImageIcon, FileText } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { GlobalLayout } from "@/components/GlobalLayout";

type MediaAsset = { id: string; name: string; mimeType: string; sizeBytes: number; folderId: string | null; createdAt: string; contentUrl: string };
type Folder = { id: string; name: string };
type Playlist = { id: string; name: string; mediaIds: string[] };

const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "flac", "aac", "opus"];
const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "avi", "mkv", "m4v"];
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
const MAX_BYTES = 25 * 1024 * 1024;

function kindOf(asset: MediaAsset) {
  const mime = asset.mimeType || "";
  const ext = asset.name.split(".").pop()?.toLowerCase() || "";
  if (mime.startsWith("audio/") || AUDIO_EXTENSIONS.includes(ext)) return "audio";
  if (mime.startsWith("video/") || VIDEO_EXTENSIONS.includes(ext)) return "video";
  if (mime.startsWith("image/") || IMAGE_EXTENSIONS.includes(ext)) return "image";
  return "file";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export default function MediaLibraryPage() {
  const { user, isAuthenticated } = useAuth();
  const { config } = useTheme();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState("all");
  const [playlistFilter, setPlaylistFilter] = useState("all");
  const [newFolder, setNewFolder] = useState("");
  const [newPlaylist, setNewPlaylist] = useState("");
  const [addPlaylistId, setAddPlaylistId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const userId = user?.id || "";

  const loadLibrary = useCallback(async () => {
    if (!userId) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ userId });
      if (search.trim()) params.set("search", search.trim());
      if (folderFilter !== "all") params.set("folderId", folderFilter);
      const response = await fetch("/api/media?" + params.toString());
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Could not load media library");
      setAssets(payload.assets || []);
      setFolders(payload.folders || []);
      setPlaylists(payload.playlists || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load media library");
    } finally { setIsLoading(false); }
  }, [userId, search, folderFilter]);

  useEffect(() => { void loadLibrary(); }, [loadLibrary]);

  const visibleAssets = useMemo(() => {
    if (playlistFilter === "all") return assets;
    const playlist = playlists.find((entry) => entry.id === playlistFilter);
    return playlist ? assets.filter((asset) => playlist.mediaIds.includes(asset.id)) : assets;
  }, [assets, playlistFilter, playlists]);

  const uploadFiles = async (files: File[]) => {
    if (!userId) { toast.error("Sign in to save files to your library"); return; }
    setIsUploading(true);
    let uploaded = 0;
    try {
      for (const file of files) {
        if (file.size > MAX_BYTES) { toast.error(file.name + " is larger than 25MB"); continue; }
        const content = await readAsDataUrl(file);
        const response = await fetch("/api/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, name: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size, content, folderId: folderFilter === "all" ? null : folderFilter }) });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Upload failed");
        uploaded += 1;
      }
      if (uploaded) toast.success(uploaded + " file" + (uploaded === 1 ? "" : "s") + " added to your library");
      await loadLibrary();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Upload failed"); }
    finally { setIsUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  };

  const createFolder = async () => {
    const name = newFolder.trim();
    if (!name || !userId) return;
    const response = await fetch("/api/media/folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, name }) });
    const payload = await response.json();
    if (!response.ok) { toast.error(payload.message || "Could not create folder"); return; }
    setNewFolder("");
    await loadLibrary();
    setFolderFilter(payload.folder.id);
  };

  const createPlaylist = async () => {
    const name = newPlaylist.trim();
    if (!name || !userId) return;
    const response = await fetch("/api/media/playlists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, name }) });
    const payload = await response.json();
    if (!response.ok) { toast.error(payload.message || "Could not create playlist"); return; }
    setNewPlaylist("");
    await loadLibrary();
  };

  const moveAsset = async (assetId: string, nextFolderId: string) => {
    const response = await fetch("/api/media/" + encodeURIComponent(assetId), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, folderId: nextFolderId || null }) });
    if (!response.ok) { toast.error("Could not move file"); return; }
    await loadLibrary();
  };

  const addToPlaylist = async (assetId: string) => {
    if (!addPlaylistId) { toast.error("Create or choose a playlist first"); return; }
    const response = await fetch("/api/media/playlists/" + encodeURIComponent(addPlaylistId) + "/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, mediaId: assetId }) });
    const payload = await response.json();
    if (!response.ok) { toast.error(payload.message || "Could not add to playlist"); return; }
    setPlaylists((current) => current.map((playlist) => playlist.id === payload.playlist.id ? payload.playlist : playlist));
    toast.success("Added to playlist");
  };

  const deleteAsset = async (asset: MediaAsset) => {
    if (!window.confirm("Delete " + asset.name + " from your media library?")) return;
    const response = await fetch("/api/media/" + encodeURIComponent(asset.id) + "?userId=" + encodeURIComponent(userId), { method: "DELETE" });
    if (!response.ok) { toast.error("Could not delete file"); return; }
    setAssets((current) => current.filter((entry) => entry.id !== asset.id));
    setPlaylists((current) => current.map((playlist) => ({ ...playlist, mediaIds: playlist.mediaIds.filter((id) => id !== asset.id) })));
    toast.success("File deleted");
  };

  if (!isAuthenticated) {
    return <GlobalLayout><div className="flex h-full items-center justify-center p-6 text-center text-white"><div><HardDrive size={42} className="mx-auto mb-4 text-cyan-300" /><h1 className="text-2xl font-bold">Your Media Library</h1><p className="mt-2 text-sm text-white/55">Sign in to keep files, playlists, and folders attached to your account.</p><button type="button" onClick={() => window.location.href = "/"} className="mt-5 rounded-xl px-4 py-2 text-sm font-semibold" style={{ background: config.accent, color: "#05070c" }}>Go to ENOSX AI</button></div></div></GlobalLayout>;
  }

  return <GlobalLayout>
    <div className="min-h-full overflow-y-auto px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-cyan-300"><HardDrive size={15} /> ENOSX Storage</div><h1 className="text-3xl font-bold tracking-tight">Media Library</h1><p className="mt-1 text-sm text-white/50">Your files, folders, playlists, and playable media in one place.</p></div>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition hover:brightness-110" style={{ background: config.accent, color: "#05070c" }}><Upload size={17} />{isUploading ? "Uploading…" : "Upload files"}<input ref={inputRef} type="file" multiple className="sr-only" onChange={(event) => void uploadFiles(Array.from(event.target.files || []))} /></label>
        </header>

        <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Browse</p><button type="button" onClick={() => { setFolderFilter("all"); setPlaylistFilter("all"); }} className="mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm" style={{ background: folderFilter === "all" && playlistFilter === "all" ? "rgba(0,242,255,0.12)" : "transparent", color: config.text }}><span>All media</span><span className="text-xs text-white/35">{assets.length}</span></button>{folders.map((folder) => <button key={folder.id} type="button" onClick={() => { setFolderFilter(folder.id); setPlaylistFilter("all"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/65 hover:bg-white/5"><span className="truncate">{folder.name}</span></button>)}</div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40"><ListMusic size={14} /> Playlists</div>{playlists.map((playlist) => <button key={playlist.id} type="button" onClick={() => { setPlaylistFilter(playlist.id); setFolderFilter("all"); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-white/65 hover:bg-white/5"><span className="truncate">{playlist.name}</span><span className="text-xs text-white/35">{playlist.mediaIds.length}</span></button>)}<div className="mt-3 flex gap-2"><input value={newPlaylist} onChange={(event) => setNewPlaylist(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void createPlaylist(); }} placeholder="New playlist" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white outline-none" /><button type="button" onClick={() => void createPlaylist()} className="rounded-lg border border-white/10 px-2 text-white/60 hover:bg-white/10"><ListMusic size={14} /></button></div></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40"><FolderPlus size={14} /> Folders</div><div className="flex gap-2"><input value={newFolder} onChange={(event) => setNewFolder(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void createFolder(); }} placeholder="New folder" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white outline-none" /><button type="button" onClick={() => void createFolder()} className="rounded-lg border border-white/10 px-2 text-white/60 hover:bg-white/10"><FolderPlus size={14} /></button></div></div>
          </aside>

          <section className="min-w-0"><div className="mb-4 flex flex-col gap-3 sm:flex-row"><div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3"><Search size={16} className="shrink-0 text-white/35" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your files" className="w-full bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-white/30" /></div><select value={folderFilter} onChange={(event) => { setFolderFilter(event.target.value); setPlaylistFilter("all"); }} className="rounded-xl border border-white/10 bg-[#10131c] px-3 py-2 text-sm text-white/70 outline-none"><option value="all">All folders</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select><select value={addPlaylistId} onChange={(event) => setAddPlaylistId(event.target.value)} className="rounded-xl border border-white/10 bg-[#10131c] px-3 py-2 text-sm text-white/70 outline-none"><option value="">Add to playlist…</option>{playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.name}</option>)}</select></div>
            {isLoading ? <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-10 text-center text-sm text-white/45">Loading your media…</div> : visibleAssets.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-14 text-center"><HardDrive size={34} className="mx-auto mb-3 text-white/25" /><p className="text-sm text-white/55">No files in this view yet.</p><p className="mt-1 text-xs text-white/30">Upload music, videos, images, documents, or any other file type.</p></div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleAssets.map((asset) => { const kind = kindOf(asset); return <article key={asset.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/10"><div className="flex min-h-[150px] items-center justify-center bg-black/20 p-3">{kind === "image" ? <img src={asset.contentUrl} alt={asset.name} className="max-h-44 w-full rounded-xl object-contain" /> : kind === "audio" ? <div className="w-full text-center"><Music2 size={34} className="mx-auto mb-3 text-cyan-300" /><audio controls preload="metadata" src={asset.contentUrl} className="w-full" /></div> : kind === "video" ? <video controls preload="metadata" src={asset.contentUrl} className="max-h-44 w-full rounded-xl" /> : <div className="text-center text-white/35"><FileText size={34} className="mx-auto mb-2" /><p className="text-xs">File ready to download</p></div>}</div><div className="space-y-3 p-3"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-semibold text-white/85" title={asset.name}>{asset.name}</h2><p className="mt-1 text-[10px] text-white/35">{formatBytes(asset.sizeBytes)} · {asset.mimeType}</p></div>{kind === "audio" && <Play size={14} className="mt-1 text-cyan-300" />}{kind === "video" && <Video size={14} className="mt-1 text-violet-300" />}{kind === "image" && <ImageIcon size={14} className="mt-1 text-emerald-300" />}</div><div className="flex gap-2"><select value={asset.folderId || ""} onChange={(event) => void moveAsset(asset.id, event.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#10131c] px-2 py-1.5 text-xs text-white/60 outline-none"><option value="">No folder</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select><a href={asset.contentUrl} download={asset.name} className="rounded-lg border border-white/10 px-2 py-1.5 text-xs text-white/55 hover:bg-white/10">Download</a><button type="button" onClick={() => void deleteAsset(asset)} className="rounded-lg border border-red-400/15 px-2 py-1.5 text-red-300/70 hover:bg-red-400/10" title="Delete file"><Trash2 size={14} /></button></div><button type="button" onClick={() => void addToPlaylist(asset.id)} disabled={!addPlaylistId} className="w-full rounded-lg border border-cyan-300/15 bg-cyan-300/[0.05] px-2 py-1.5 text-xs font-semibold text-cyan-200/75 transition hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-40">Add to selected playlist</button></div></article>; })}</div>}
          </section>
        </div>
      </div>
    </div>
  </GlobalLayout>;
}
