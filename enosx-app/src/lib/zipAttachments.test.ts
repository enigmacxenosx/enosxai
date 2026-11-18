import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import type { Attachment } from "@/lib/types";
import { createAttachmentsZip } from "./zipAttachments";

const tinyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function attachment(id: string, name: string, content: string, mimeType: string): Attachment {
  return { id, name, type: name.split(".").pop() || "file", size: content.length, content, mimeType };
}

describe("createAttachmentsZip", () => {
  it("compresses multiple uploaded images and documents into a readable ZIP", async () => {
    const files = [
      attachment("image-1", "receipt.png", tinyPng, "image/png"),
      attachment("image-2", "receipt.png", tinyPng, "image/png"),
      attachment("notes", "notes.txt", "Quarterly launch notes", "text/plain"),
      attachment("brief", "brief.md", "# Launch brief\n\nShip the asset bundle.", "text/markdown"),
    ];

    const archive = await createAttachmentsZip(files);
    expect(archive.type).toBe("application/zip");
    expect(archive.size).toBeGreaterThan(0);

    const loaded = await JSZip.loadAsync(archive);
    expect(Object.keys(loaded.files).sort()).toEqual(["brief.md", "notes.txt", "receipt-2.png", "receipt.png"]);
    expect(await loaded.file("notes.txt")?.async("string")).toBe("Quarterly launch notes");
    expect(await loaded.file("brief.md")?.async("string")).toContain("Launch brief");
    expect((await loaded.file("receipt.png")?.async("uint8array"))?.length).toBeGreaterThan(10);
  });
});
