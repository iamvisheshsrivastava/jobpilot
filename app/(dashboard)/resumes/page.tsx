"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Plus, Pencil, Trash2, ExternalLink, Upload, X, Eye } from "lucide-react";
import { useSession } from "next-auth/react";
import { DEMO_ACCOUNT_EMAIL } from "@/lib/api";

interface ResumeVersionItem {
  id: string;
  name: string;
  fileUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  applications: number;
  interviews: number;
}

// Resolve fileUrl to a viewable URL:
// - data: URLs → use as-is
// - r2://... → fetch a signed URL from the API
// - other URLs → use as-is
async function resolveFileUrl(fileUrl: string): Promise<string> {
  if (fileUrl.startsWith("data:") || !fileUrl.startsWith("r2://")) {
    return fileUrl;
  }
  const key = fileUrl.slice(5); // strip "r2://"
  const res = await fetch(`/api/upload/sign?key=${encodeURIComponent(key)}`);
  if (!res.ok) throw new Error("Could not generate file URL");
  const { signedUrl } = await res.json();
  return signedUrl;
}

export default function ResumesPage() {
  const { data: session } = useSession();
  const isDemo = session?.user?.email === DEMO_ACCOUNT_EMAIL;

  const [versions, setVersions] = useState<ResumeVersionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<ResumeVersionItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formFileUrl, setFormFileUrl] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview modal
  const [previewItem, setPreviewItem] = useState<ResumeVersionItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setFormError("File too large. Max size is 10 MB.");
      return;
    }
    setFormFile(file);
    setFormFileUrl("");
    setFormError("");
  }

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/resume-versions");
      if (res.ok) setVersions(await res.json());
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVersions(); }, [fetchVersions]);

  function openCreate() {
    setEditTarget(null);
    setFormName(""); setFormNotes(""); setFormFileUrl(""); setFormFile(null); setFormError("");
    setShowModal(true);
  }

  function openEdit(v: ResumeVersionItem) {
    setEditTarget(v);
    setFormName(v.name);
    setFormNotes(v.notes || "");
    setFormFileUrl(v.fileUrl?.startsWith("data:") || v.fileUrl?.startsWith("r2://") ? "" : (v.fileUrl || ""));
    setFormFile(null); setFormError("");
    setShowModal(true);
  }

  async function openPreview(v: ResumeVersionItem) {
    if (!v.fileUrl) return;
    setPreviewItem(v);
    setPreviewUrl(null);
    setPreviewError("");
    setPreviewLoading(true);
    try {
      const url = await resolveFileUrl(v.fileUrl);
      setPreviewUrl(url);
    } catch {
      setPreviewError("Could not load file for preview.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSubmit() {
    if (!formName.trim()) { setFormError("Name is required"); return; }
    setFormSaving(true); setFormError("");

    try {
      let fileUrl: string | null = formFileUrl.trim() || null;

      if (formFile) {
        // Upload to R2
        const fd = new FormData();
        fd.append("file", formFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          setFormError(err.error || "Upload failed");
          setFormSaving(false);
          return;
        }
        const { url } = await uploadRes.json();
        fileUrl = url; // r2://<key>
      }

      const body = { name: formName.trim(), notes: formNotes.trim() || null, fileUrl };

      if (editTarget) {
        const res = await fetch(`/api/resume-versions/${editTarget.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        if (!res.ok) { setFormError((await res.json()).error || "Failed to update"); setFormSaving(false); return; }
      } else {
        const res = await fetch("/api/resume-versions", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        if (!res.ok) { setFormError((await res.json()).error || "Failed to create"); setFormSaving(false); return; }
      }

      setShowModal(false);
      await fetchVersions();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Network error");
    } finally {
      setFormSaving(false);
    }
  }

  async function handleDelete(id: string, name: string, fileUrl: string | null) {
    if (!confirm(`Delete "${name}"? This will unlink it from all associated jobs.`)) return;
    try {
      // Delete file from R2 if stored there
      if (fileUrl?.startsWith("r2://")) {
        const key = fileUrl.slice(5);
        await fetch(`/api/upload?key=${encodeURIComponent(key)}`, { method: "DELETE" });
      }
      await fetch(`/api/resume-versions/${id}`, { method: "DELETE" });
      await fetchVersions();
    } catch {
      // Silently fail
    }
  }

  const isPdf = (url: string) =>
    url.includes("pdf") || url.endsWith(".pdf") || url.startsWith("data:application/pdf");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Resume Versions</h2>
        {!isDemo && (
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            onClick={openCreate}
          >
            <Plus className="size-4" /> Add Version
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading...</div>
      ) : versions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
          <FileText className="size-12" />
          <p className="text-sm">No resume versions yet. Add your first one!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {versions.map((v) => (
            <div key={v.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{v.name}</h3>
                  {v.notes && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{v.notes}</p>}
                </div>
              </div>

              <div className="mt-3 space-y-1 text-xs text-slate-400">
                <p>Created {new Date(v.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
                <p>Applications: {v.applications} | Interviews: {v.interviews}</p>
              </div>

              {v.fileUrl && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {/* Preview button — always shown for files we can display */}
                  <button
                    onClick={() => openPreview(v)}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    <Eye className="size-3" /> View
                  </button>

                  {/* Download / open externally */}
                  {v.fileUrl.startsWith("data:") ? (
                    <a
                      href={v.fileUrl}
                      download={`${v.name}.${v.fileUrl.includes("pdf") ? "pdf" : "docx"}`}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:underline"
                    >
                      <FileText className="size-3" /> Download
                    </a>
                  ) : !v.fileUrl.startsWith("r2://") ? (
                    <a
                      href={v.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:underline"
                    >
                      <ExternalLink className="size-3" /> Open
                    </a>
                  ) : null}
                </div>
              )}

              {!isDemo && (
                <div className="mt-3 flex gap-1.5">
                  <button
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    onClick={() => openEdit(v)}
                  >
                    <Pencil className="size-3" /> Edit
                  </button>
                  <button
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(v.id, v.name, v.fileUrl)}
                  >
                    <Trash2 className="size-3" /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Preview Modal ────────────────────────────────────── */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="relative flex w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl overflow-hidden"
            style={{ height: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <span className="text-sm font-semibold text-slate-800 truncate">{previewItem.name}</span>
              <button
                className="ml-2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setPreviewItem(null)}
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Preview area */}
            <div className="flex flex-1 items-center justify-center overflow-hidden bg-slate-50">
              {previewLoading && (
                <p className="text-sm text-slate-400">Loading preview…</p>
              )}
              {previewError && (
                <p className="text-sm text-red-500">{previewError}</p>
              )}
              {previewUrl && !previewLoading && (
                isPdf(previewUrl) ? (
                  <iframe
                    src={previewUrl}
                    className="h-full w-full border-0"
                    title={previewItem.name}
                  />
                ) : (
                  // For non-PDF files (docx, etc.) show a download prompt
                  <div className="flex flex-col items-center gap-4 text-slate-500">
                    <FileText className="size-16 text-slate-300" />
                    <p className="text-sm">Preview not available for this file type.</p>
                    <a
                      href={previewUrl}
                      download={previewItem.name}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Download to view
                    </a>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Create/Edit Modal ────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{editTarget ? "Edit Version" : "Add Resume Version"}</h3>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setShowModal(false)}>
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Name *</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                  placeholder="e.g. ML Resume v2"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 min-h-[60px]"
                  placeholder="What makes this version different..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Resume File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  <Upload className="size-4" />
                  {formFile ? formFile.name : "Click to upload PDF or Word doc (max 10 MB)"}
                </button>
                {formFile && (
                  <button
                    type="button"
                    className="mt-1 text-xs text-red-500 hover:underline"
                    onClick={() => { setFormFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  >
                    Remove file
                  </button>
                )}
                {!formFile && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs text-slate-400">Or paste a link (Google Drive, Dropbox, etc.)</p>
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                      placeholder="https://drive.google.com/..."
                      value={formFileUrl}
                      onChange={(e) => setFormFileUrl(e.target.value)}
                    />
                  </div>
                )}
                {editTarget?.fileUrl && !formFile && (
                  <p className="mt-1 text-xs text-slate-400">
                    {editTarget.fileUrl.startsWith("r2://")
                      ? "✓ File already uploaded to storage"
                      : editTarget.fileUrl.startsWith("data:")
                      ? "✓ File already uploaded"
                      : `Current: ${editTarget.fileUrl.slice(0, 60)}…`}
                  </p>
                )}
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  onClick={handleSubmit}
                  disabled={formSaving}
                >
                  {formSaving ? (formFile ? "Uploading…" : "Saving…") : editTarget ? "Save Changes" : "Add Version"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
