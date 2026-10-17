import * as XLSX from "xlsx";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

type ExportFormat = "pdf" | "docx" | "xlsx";

declare global {
  interface Window {
    jspdf?: {
      jsPDF: new () => {
        setFontSize(size: number): void;
        text(text: string | string[], x: number, y: number, options?: { maxWidth?: number }): void;
        splitTextToSize(text: string, maxWidth: number): string[];
        addPage(): void;
        save(filename: string): void;
      };
    };
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function cleanText(content: string) {
  return content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/```[a-zA-Z0-9+#_-]*\n?/g, "")
    .replace(/[*_~`]/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .trim();
}

function safeBaseName(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 48) || "enosx-ai-document";
}

function exportPdf(content: string, baseName: string) {
  const JsPdf = window.jspdf?.jsPDF;
  if (!JsPdf) throw new Error("PDF export is unavailable in this browser session.");

  const doc = new JsPdf();
  const lines = doc.splitTextToSize(cleanText(content), 180);
  const lineHeight = 7;
  const pageHeight = 280;
  let y = 20;
  doc.setFontSize(12);
  for (const line of lines) {
    if (y > pageHeight) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, 15, y);
    y += lineHeight;
  }
  doc.save(`${baseName}.pdf`);
}

function markdownToWordParagraphs(content: string) {
  return content.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return new Paragraph({ spacing: { after: 120 } });
    if (/^###\s+/.test(trimmed)) {
      return new Paragraph({ text: trimmed.replace(/^###\s+/, ""), heading: HeadingLevel.HEADING_3 });
    }
    if (/^##\s+/.test(trimmed)) {
      return new Paragraph({ text: trimmed.replace(/^##\s+/, ""), heading: HeadingLevel.HEADING_2 });
    }
    if (/^#\s+/.test(trimmed)) {
      return new Paragraph({ text: trimmed.replace(/^#\s+/, ""), heading: HeadingLevel.HEADING_1 });
    }
    if (/^[-*]\s+/.test(trimmed)) {
      return new Paragraph({
        text: trimmed.replace(/^[-*]\s+/, ""),
        bullet: { level: 0 },
      });
    }
    return new Paragraph({
      children: [new TextRun(cleanText(trimmed))],
      spacing: { after: 140 },
    });
  });
}

async function exportWord(content: string, baseName: string) {
  const document = new Document({
    creator: "ENOSX AI",
    title: "ENOSX AI document",
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: "ENOSX AI",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
        }),
        ...markdownToWordParagraphs(content),
      ],
    }],
  });
  downloadBlob(await Packer.toBlob(document), `${baseName}.docx`);
}

function exportExcel(content: string, baseName: string) {
  const lines = cleanText(content).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows = lines.map((line) => {
    if (line.includes("|")) {
      return line.split("|").map((cell) => cell.trim()).filter(Boolean);
    }
    if (line.includes("\t")) return line.split("\t").map((cell) => cell.trim());
    return [line];
  }).filter((row) => row.length > 0 && !row.every((cell) => /^:?-{3,}:?$/.test(cell)));

  const worksheet = XLSX.utils.aoa_to_sheet(rows.length ? rows : [["ENOSX AI response"]]);
  worksheet["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 28 }, { wch: 28 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "ENOSX AI");
  XLSX.writeFile(workbook, `${baseName}.xlsx`);
}

export async function downloadDocument(format: ExportFormat, content: string, label = "enosx-ai-document") {
  const baseName = safeBaseName(label);
  if (format === "pdf") exportPdf(content, baseName);
  if (format === "docx") await exportWord(content, baseName);
  if (format === "xlsx") exportExcel(content, baseName);
}
