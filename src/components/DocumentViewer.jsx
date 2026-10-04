import { useEffect, useState } from "react";
import { Download, ExternalLink, FileText } from "lucide-react";
import { chapterApi } from "../services/api";
import { Feedback } from "./StatusBadge";

const PREVIEWABLE_TYPES = new Set(["application/pdf"]);

const EXTENSIONS = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

const formatSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// The document endpoint needs the bearer token, so it can't be pointed at with a
// plain <a href>. The bytes are fetched here and turned into an object URL that
// lives only as long as this component does.
export default function DocumentViewer({ chapterId, name = "Chapter document", className = "" }) {
  const [document, setDocument] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    const load = async () => {
      setLoading(true);
      setError("");
      setDocument(null);

      try {
        const response = await fetch(chapterApi.documentUrl(chapterId), {
          credentials: "include",
          headers: chapterApi.authHeaders(),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || "The document could not be loaded");
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);

        // The fetch may outlive the component; drop the URL rather than leak it.
        if (!active) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = "";
          return;
        }

        setDocument({
          url: objectUrl,
          mimeType: blob.type || "application/octet-stream",
          size: blob.size,
        });
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    if (chapterId) load();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [chapterId]);

  if (loading) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900 ${className}`}>
        <div className="h-3 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-4 h-64 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  if (error) {
    return <Feedback tone="error">{error}</Feedback>;
  }

  if (!document) return null;

  if (PREVIEWABLE_TYPES.has(document.mimeType)) {
    return (
      <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${className}`}>
        <iframe
          src={document.url}
          title={name}
          className="h-112 w-full"
        />
      </div>
    );
  }

  // Word documents can't be rendered by the browser, so offer them as a file
  // the supervisor can open or download instead of faking a preview.
  const extension = EXTENSIONS[document.mimeType] ?? "file";
  const downloadName = `${name.replace(/[^\w.\- ]+/g, "_")}.${extension}`;

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
        <FileText size={22} />
      </div>
      <p className="mt-3 font-medium text-slate-900 dark:text-slate-100">{downloadName}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {formatSize(document.size)}
        {formatSize(document.size) ? " · " : ""}
        This format can&rsquo;t be previewed here.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <a
          href={document.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <ExternalLink size={15} /> Open in new tab
        </a>
        <a
          href={document.url}
          download={downloadName}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Download size={15} /> Download
        </a>
      </div>
    </div>
  );
}
