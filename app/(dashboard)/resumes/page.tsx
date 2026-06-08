"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Pencil, Trash2, ExternalLink, X } from "lucide-react";
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

export default function ResumesPage() {
  const { data: session } = useSession();
  const isDemo = session?.user?.email === DEMO_ACCOUNT_EMAIL;
  const router = useRouter();

  const [versions, setVersions] = useState<ResumeVersionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<ResumeVersionItem | null>(null);

  // Form state for modal
  const [formName, setFormName] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formFileUrl, setFormFileUrl] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/resume-versions");
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  function openCreate() {
    setEditTarget(null);
    setFormName("");
    setFormNotes("");
    setFormFileUrl("");
    setFormError("");
    setShowModal(true);
  }

  function openEdit(v: ResumeVersionItem) {
    setEditTarget(v);
    setFormName(v.name);
    setFormNotes(v.notes || "");
    setFormFileUrl(v.fileUrl || "");
    setFormError("");
    setShowModal(true);
  }

  async function handleSubmit() {
    if (!formName.trim()) {
      setFormError("Name is required");
      return;
    }
    setFormSaving(true);
    setFormError("");

    try {
      if (editTarget) {
        const res = await fetch(`/api/resume-versions/${editTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName.trim(), notes: formNotes.trim() || null, fileUrl: formFileUrl.trim() || null }),
        });
        if (!res.ok) {
          const err = await res.json();
          setFormError(err.error || "Failed to update");
          setFormSaving(false);
          return;
        }
      } else {
        const res = await fetch("/api/resume-versions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName.trim(), notes: formNotes.trim() || null, fileUrl: formFileUrl.trim() || null }),
        });
        if (!res.ok) {
          const err = await res.json();
          setFormError(err.error || "Failed to create");
          setFormSaving(false);
          return;
        }
      }
      setShowModal(false);
      await fetchVersions();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Network error");
    } finally {
      setFormSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This will unlink it from all associated jobs.`)) return;
    try {
      await fetch(`/api/resume-versions/${id}`, { method: "DELETE" });
      await fetchVersions();
    } catch {
      // Silently fail
    }
  }

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
            <Plus className="size-4" />
            Add Version
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
            <div
              key={v.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{v.name}</h3>
                  {v.notes && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{v.notes}</p>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-1 text-xs text-slate-400">
                <p>Created {new Date(v.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
                <p>Applications: {v.applications} | Interviews: {v.interviews}</p>
              </div>

              {v.fileUrl && (
                <a
                  href={v.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <ExternalLink className="size-3" />
                  View File
                </a>
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
                    onClick={() => handleDelete(v.id, v.name)}
                  >
                    <Trash2 className="size-3" /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
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
                <label className="mb-1 block text-xs font-medium text-slate-600">File URL (optional)</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                  placeholder="https://example.com/my-resume.pdf"
                  value={formFileUrl}
                  onChange={(e) => setFormFileUrl(e.target.value)}
                />
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
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                  onClick={handleSubmit}
                  disabled={formSaving || !formName.trim()}
                >
                  {formSaving ? "Saving..." : editTarget ? "Save Changes" : "Add Version"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}