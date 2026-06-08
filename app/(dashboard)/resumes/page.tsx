"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, Edit3, Eye, FileText, Plus, Trash2, Undo2 } from "lucide-react";

import {
  getCurrentUser,
  getResumes,
  getResume,
  getUserProfile,
  createResume,
  duplicateResume,
  deleteResume,
  createNewVersion,
  getResumeVersions,
  getJobs,
  ResumeVersion,
} from "@/lib/jobpilot-store";

type ResumeCard = {
  id: string; userId: string; name: string; category?: string; description?: string;
  currentVersionId: string; createdAt: string; updatedAt: string;
  versionNumber: number; content: string;
};

const EMPTY_COUNTS: Record<string, number> = {};

export default function ResumesPage() {
  const router = useRouter();
  const [user, setUser] = useState(getCurrentUser());
  const [resumes, setResumes] = useState<ResumeCard[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [versionPanel, setVersionPanel] = useState<string | null>(null);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    setResumes(getResumes(user.id) as ResumeCard[]);
  }, [user, router]);

  function refresh() {
    if (!user) return;
    setResumes(getResumes(user.id) as ResumeCard[]);
  }

  const jobsByResume = useMemo(() => {
    if (!user) return EMPTY_COUNTS;
    const allJobs = getJobs(user.id);
    const counts: Record<string, number> = {};
    allJobs.forEach((j) => {
      if (j.resumeId) counts[j.resumeId] = (counts[j.resumeId] || 0) + 1;
    });
    return counts;
  }, [user]);

  function handleDelete(id: string) {
    if (!user) return;
    if (!confirm("Delete this resume and all its versions?")) return;
    deleteResume(user.id, id);
    refresh();
  }

  function handleDuplicate(id: string, name: string) {
    if (!user) return;
    const newName = prompt("New resume name:", `${name} (Copy)`);
    if (!newName) return;
    duplicateResume(user.id, id, newName);
    refresh();
  }

  function handleCreateFromProfile() {
    if (!user) return;
    const profile = getUserProfile(user.id);
    const name = prompt("Resume name:", "My Resume");
    if (!name) return;
    const content = [
      profile.fullName ? `# ${profile.fullName}\n` : "",
      profile.summary ? `\n## Professional Summary\n${profile.summary}\n` : "",
      profile.skills?.length ? `\n## Skills\n${profile.skills.join(", ")}\n` : "",
      ...(profile.experience || []).map((e) => `\n## ${e.title} at ${e.company}\n${e.description}`),
      ...(profile.education || []).map((e) => `\n## ${e.degree} in ${e.field || ""}\n${e.institution}`),
      profile.certifications?.length ? `\n## Certifications\n${profile.certifications.join("\n")}\n` : "",
    ].filter(Boolean).join("\n");
    createResume(user.id, { name, content });
    refresh();
  }

  function handleDownload(content: string, name: string, version: number) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\s+/g, "_")}_v${version}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openVersions(resumeId: string) {
    setVersionPanel(versionPanel === resumeId ? null : resumeId);
    setVersions(getResumeVersions(resumeId));
  }

  function restoreVersion(resumeId: string, v: ResumeVersion) {
    if (!user) return;
    if (!confirm(`Restore version ${v.versionNumber}? This creates a new version.`)) return;
    createNewVersion(user.id, resumeId, v.content);
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Resume Library</h2>
        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            onClick={handleCreateFromProfile}
          >
            <Plus className="size-4" />
            From Profile
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            onClick={() => setShowCreator(true)}
          >
            <Plus className="size-4" />
            New Resume
          </button>
        </div>
      </div>

      {showCreator && (
        <QuickCreator
          user={user!}
          onDone={() => { setShowCreator(false); refresh(); }}
          onCancel={() => setShowCreator(false)}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {resumes.map((resume) => (
          <div
            key={resume.id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 truncate">{resume.name}</h3>
                {resume.category && (
                  <span className="inline-block mt-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600">
                    {resume.category}
                  </span>
                )}
                {resume.description && (
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{resume.description}</p>
                )}
              </div>
            </div>
            <div className="mt-3 space-y-1 text-xs text-slate-400">
              <p>Version {resume.versionNumber}</p>
              <p>Updated {new Date(resume.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
              <p>Used in {jobsByResume[resume.id] || 0} applications</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => setEditId(resume.id)}>
                <Edit3 className="size-3" /> Edit
              </button>
              <button className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => handleDuplicate(resume.id, resume.name)}>
                <Copy className="size-3" /> Duplicate
              </button>
              <button className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => handleDownload(resume.content, resume.name, resume.versionNumber)}>
                <Download className="size-3" /> Download
              </button>
              <button className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => openVersions(resume.id)}>
                <Undo2 className="size-3" /> Versions
              </button>
              <button className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50" onClick={() => handleDelete(resume.id)}>
                <Trash2 className="size-3" /> Delete
              </button>
              <button className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => setPreviewContent(resume.content)}>
                <Eye className="size-3" /> Preview
              </button>
            </div>

            {/* Version History Panel */}
            {versionPanel === resume.id && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Version History</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {versions.map((v) => (
                    <div key={v.id} className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1.5 text-xs">
                      <span className="text-slate-700">Version {v.versionNumber}</span>
                      <span className="text-slate-400">{new Date(v.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                      <div className="flex gap-1">
                        <button className="text-blue-600 hover:underline" onClick={() => setPreviewContent(v.content)}>View</button>
                        <button className="text-blue-600 hover:underline" onClick={() => restoreVersion(resume.id, v)}>Restore</button>
                      </div>
                    </div>
                  ))}
                  {!versions.length && <p className="text-xs text-slate-400">No version history</p>}
                </div>
              </div>
            )}
          </div>
        ))}
        {!resumes.length && (
          <div className="col-span-full flex flex-col items-center gap-3 py-16 text-slate-400">
            <FileText className="size-12" />
            <p className="text-sm">No resumes yet. Create your first one!</p>
          </div>
        )}
      </div>

      {editId && <ResumeEditor resumeId={editId} user={user!} onDone={() => { setEditId(null); refresh(); }} />}
      {previewContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setPreviewContent(null)}>
          <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Resume Preview</h3>
              <button className="text-xs text-slate-400 hover:text-slate-600" onClick={() => setPreviewContent(null)}>Close</button>
            </div>
            <pre className="whitespace-pre-wrap text-xs text-slate-700 font-sans">{previewContent}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickCreator({ user, onDone, onCancel }: { user: import("@/lib/jobpilot-store").User; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");

  function handleCreate() {
    if (!name.trim()) return;
    createResume(user.id, { name: name.trim(), description: description.trim() || undefined, content });
    onDone();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <h3 className="text-sm font-semibold">New Resume</h3>
      <div className="flex gap-3">
        <div className="flex-1 space-y-2">
          <input className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm" placeholder="Resume name *" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <select className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" defaultValue="" onChange={(e) => {
          if (e.target.value) {
            const categories = ["Data Science", "Machine Learning", "MLOps", "GenAI", "Software Engineering", "Research", "Academic", "Custom"];
          }
        }}>
          <option value="" disabled>Category</option>
          {["Data Science", "Machine Learning", "MLOps", "GenAI", "Software Engineering", "Research", "Academic", "Custom"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <textarea className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm min-h-[120px]" placeholder="Paste or type resume content here..." value={content} onChange={(e) => setContent(e.target.value)} />
      <div className="flex justify-end gap-2">
        <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50" onClick={onCancel}>Cancel</button>
        <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50" onClick={handleCreate} disabled={!name.trim()}>Create</button>
      </div>
    </div>
  );
}

function ResumeEditor({ resumeId, user, onDone }: { resumeId: string; user: import("@/lib/jobpilot-store").User; onDone: () => void }) {
  const [resume, setResume] = useState<ResumeCard | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const r = getResume(resumeId);
    if (r) { setResume(r); setContent(r.content); }
  }, [resumeId]);

  async function handleSave() {
    if (!resume || !content.trim()) return;
    setSaving(true);
    createNewVersion(user.id, resume.id, content);
    setSaving(false);
    onDone();
  }

  if (!resume) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex h-[85vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold">Editing: {resume.name} (v{resume.versionNumber})</h3>
          <div className="flex gap-2">
            <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save as New Version"}</button>
            <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50" onClick={onDone}>Close</button>
          </div>
        </div>
        <textarea className="flex-1 w-full p-4 text-sm font-mono outline-none resize-none" value={content} onChange={(e) => setContent(e.target.value)} />
      </div>
    </div>
  );
}