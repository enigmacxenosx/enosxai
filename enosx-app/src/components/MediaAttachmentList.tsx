import { useState } from "react";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import type { Attachment } from "@/lib/types";
import MediaAttachment from "./MediaAttachment";

const IMAGE_EXTENSIONS = /\.(?:jpe?g|png|gif|webp|bmp|avif|heic|svg)$/i;
function isImage(attachment: Attachment) {
  return Boolean(attachment.mimeType?.toLowerCase().startsWith("image/") || IMAGE_EXTENSIONS.test(attachment.name));
}
function sourceFor(attachment: Attachment) {
  return attachment.content || attachment.url || "";
}

export default function MediaAttachmentList({ attachments }: { attachments: Attachment[] }) {
  const images = attachments.filter(isImage);
  const otherFiles = attachments.filter((attachment) => !isImage(attachment));
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeImage = activeIndex === null ? undefined : images[activeIndex];
  const changeImage = (offset: number) => {
    if (!images.length) return;
    setActiveIndex((current) => ((current ?? 0) + offset + images.length) % images.length);
  };

  return (
    <div className="flex flex-col gap-2">
      {images.length > 0 && (
        <section className="w-full max-w-[620px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-2.5" aria-label={`${images.length} uploaded image${images.length === 1 ? "" : "s"}`}>
          <div className="mb-2 flex items-center gap-2 px-1 text-xs font-medium text-white/65">
            <Images size={14} aria-hidden="true" />
            <span>{images.length} image{images.length === 1 ? "" : "s"}</span>
            {images.length > 1 && <span className="text-white/35">· select a thumbnail to browse</span>}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className="group relative aspect-square min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/30 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                aria-label={`View image ${index + 1} of ${images.length}: ${image.name}`}
              >
                <img src={sourceFor(image)} alt={image.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/85 to-transparent px-2 pb-2 pt-5 text-[11px] text-white/85">{image.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {otherFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {otherFiles.map((attachment) => <MediaAttachment key={attachment.id} attachment={attachment} />)}
        </div>
      )}
      {activeImage && activeIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Image ${activeIndex + 1} of ${images.length}: ${activeImage.name}`}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={() => setActiveIndex(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setActiveIndex(null);
            if (event.key === "ArrowLeft") changeImage(-1);
            if (event.key === "ArrowRight") changeImage(1);
          }}
          tabIndex={-1}
        >
          <button type="button" onClick={() => setActiveIndex(null)} aria-label="Close image viewer" className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/50 p-2 text-white hover:bg-white/15">
            <X size={20} />
          </button>
          {images.length > 1 && (
            <button type="button" onClick={(event) => { event.stopPropagation(); changeImage(-1); }} aria-label="Previous image" className="absolute left-3 rounded-full border border-white/15 bg-black/50 p-2 text-white hover:bg-white/15 sm:left-6">
              <ChevronLeft size={24} />
            </button>
          )}
          <figure className="flex max-h-[90vh] max-w-[min(90vw,1200px)] flex-col items-center gap-3" onClick={(event) => event.stopPropagation()}>
            <img src={sourceFor(activeImage)} alt={activeImage.name} className="max-h-[82vh] max-w-full rounded-xl object-contain shadow-2xl" />
            <figcaption className="text-center text-sm text-white/75">{activeImage.name} <span className="text-white/45">· {activeIndex + 1} of {images.length}</span></figcaption>
          </figure>
          {images.length > 1 && (
            <button type="button" onClick={(event) => { event.stopPropagation(); changeImage(1); }} aria-label="Next image" className="absolute right-3 rounded-full border border-white/15 bg-black/50 p-2 text-white hover:bg-white/15 sm:right-6">
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
