import { MAX_PDF_PAGES } from "@/lib/upload-constants";

export async function renderPdfPages(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const count = Math.min(doc.numPages, MAX_PDF_PAGES);
  const pages: { file: File; width: number; height: number; page: number }[] = [];

  for (let pageNumber = 1; pageNumber <= count; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    if (!context) continue;
    await page.render({ canvasContext: context, viewport }).promise;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) continue;
    pages.push({
      page: pageNumber,
      width: Math.round(viewport.width),
      height: Math.round(viewport.height),
      file: new File([blob], `${file.name.replace(/\.pdf$/i, "")}-p${pageNumber}.png`, {
        type: "image/png",
      }),
    });
  }

  return { pages, truncated: doc.numPages > MAX_PDF_PAGES };
}
