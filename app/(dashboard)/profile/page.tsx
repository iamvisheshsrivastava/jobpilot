"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Briefcase,
  GraduationCap,
  Languages,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EducationEntry,
  ExperienceEntry,
  getCurrentUser,
  getUserProfile,
  isDemoAccount,
  saveUserProfile,
  User,
  UserProfile,
} from "@/lib/jobpilot-store";

const LANGUAGE_LEVELS = ["Native", "Fluent", "Advanced (C1)", "Upper-Intermediate (B2)", "Intermediate (B1)", "Basic (A2)"];

function emptyExp(): Omit<ExperienceEntry, "id"> {
  return { company: "", title: "", startDate: "", endDate: "", location: "", description: "" };
}
function emptyEdu(): Omit<EducationEntry, "id"> {
  return { institution: "", degree: "", field: "", startDate: "", endDate: "" };
}

function shortId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saved, setSaved] = useState(false);
  const isDemo = isDemoAccount(user);
  const fileRef = useRef<HTMLInputElement>(null);

  // Skills
  const [skillInput, setSkillInput] = useState("");

  // Experience dialog
  const [expDialog, setExpDialog] = useState<{ open: boolean; entry: ExperienceEntry | null }>({ open: false, entry: null });
  const [expForm, setExpForm] = useState(emptyExp());

  // Education dialog
  const [eduDialog, setEduDialog] = useState<{ open: boolean; entry: EducationEntry | null }>({ open: false, entry: null });
  const [eduForm, setEduForm] = useState(emptyEdu());

  // Language
  const [langInput, setLangInput] = useState("");
  const [langLevel, setLangLevel] = useState(LANGUAGE_LEVELS[0]);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) return;
    setUser(u);
    setProfile(getUserProfile(u.id));
  }, []);

  function update(partial: Partial<UserProfile>) {
    setProfile((prev) => prev ? { ...prev, ...partial } : null);
  }

  function handleSave() {
    if (!profile || isDemo) return;
    saveUserProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // ── File upload ─────────────────────────────────────────────────────────────
  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      const text = await file.text();
      update({ cvText: text });
    } else if (file.name.endsWith(".pdf")) {
      try {
        // Dynamic import of pdfjs-dist
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          text += content.items.map((item: any) => item.str ?? "").join(" ") + "\n";
        }
        update({ cvText: text });
      } catch {
        alert("Could not extract text from this PDF. Please paste your CV text manually.");
      }
    } else {
      alert("Supported formats: PDF, TXT, MD. Please convert your file or paste the text below.");
    }
    // Reset file input
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Skills ───────────────────────────────────────────────────────────────────
  function addSkill() {
    const s = skillInput.trim();
    if (!s || !profile) return;
    const incoming = s.split(",").map((x) => x.trim()).filter(Boolean);
    const existing = new Set((profile.skills || []).map((sk) => sk.toLowerCase()));
    const newSkills = incoming.filter((x) => !existing.has(x.toLowerCase()));
    update({ skills: [...(profile.skills || []), ...newSkills] });
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    if (!profile) return;
    update({ skills: profile.skills.filter((s) => s !== skill) });
  }

  // ── Experience ───────────────────────────────────────────────────────────────
  function openAddExp() {
    setExpForm(emptyExp());
    setExpDialog({ open: true, entry: null });
  }

  function openEditExp(entry: ExperienceEntry) {
    setExpForm({ company: entry.company, title: entry.title, startDate: entry.startDate, endDate: entry.endDate || "", location: entry.location || "", description: entry.description });
    setExpDialog({ open: true, entry });
  }

  function handleExpSave(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (expDialog.entry) {
      update({ experience: profile.experience.map((ex) => ex.id === expDialog.entry!.id ? { ...expForm, id: ex.id } : ex) });
    } else {
      update({ experience: [...profile.experience, { ...expForm, id: shortId() }] });
    }
    setExpDialog({ open: false, entry: null });
  }

  function removeExp(id: string) {
    if (!profile) return;
    update({ experience: profile.experience.filter((e) => e.id !== id) });
  }

  // ── Education ────────────────────────────────────────────────────────────────
  function openAddEdu() {
    setEduForm(emptyEdu());
    setEduDialog({ open: true, entry: null });
  }

  function openEditEdu(entry: EducationEntry) {
    setEduForm({ institution: entry.institution, degree: entry.degree, field: entry.field || "", startDate: entry.startDate || "", endDate: entry.endDate || "" });
    setEduDialog({ open: true, entry });
  }

  function handleEduSave(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (eduDialog.entry) {
      update({ education: profile.education.map((ed) => ed.id === eduDialog.entry!.id ? { ...eduForm, id: ed.id } : ed) });
    } else {
      update({ education: [...profile.education, { ...eduForm, id: shortId() }] });
    }
    setEduDialog({ open: false, entry: null });
  }

  function removeEdu(id: string) {
    if (!profile) return;
    update({ education: profile.education.filter((e) => e.id !== id) });
  }

  // ── Languages ────────────────────────────────────────────────────────────────
  function addLang() {
    const lang = langInput.trim();
    if (!lang || !profile) return;
    if (profile.languages.some((l) => l.language.toLowerCase() === lang.toLowerCase())) return;
    update({ languages: [...profile.languages, { language: lang, level: langLevel }] });
    setLangInput("");
  }

  function removeLang(lang: string) {
    if (!profile) return;
    update({ languages: profile.languages.filter((l) => l.language !== lang) });
  }

  if (!profile) {
    return <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading profile…</div>;
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Save bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Your profile is stored locally and used for AI-powered CV generation and job suitability checks.
        </p>
        <Button
          onClick={handleSave}
          disabled={isDemo}
          className="gap-2 bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          <Save className="size-4" />
          {saved ? "Saved ✓" : "Save Profile"}
        </Button>
      </div>

      {isDemo && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          This is the demo profile — editing is disabled. Sign up for a free account to build your own profile.
        </div>
      )}

      {/* ── Personal Info ─────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-slate-900">Personal Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" value={profile.fullName || ""} onChange={(e) => update({ fullName: e.target.value })} placeholder="Your full name" disabled={isDemo} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profileEmail">Email</Label>
            <Input id="profileEmail" value={user?.email || ""} readOnly className="bg-slate-50 text-slate-500" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={profile.phone || ""} onChange={(e) => update({ phone: e.target.value })} placeholder="+49 176 00000000" disabled={isDemo} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={profile.location || ""} onChange={(e) => update({ location: e.target.value })} placeholder="Berlin, Germany" disabled={isDemo} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="linkedin">LinkedIn URL</Label>
            <Input id="linkedin" value={profile.linkedin || ""} onChange={(e) => update({ linkedin: e.target.value })} placeholder="linkedin.com/in/username" disabled={isDemo} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">Website / Portfolio</Label>
            <Input id="website" value={profile.website || ""} onChange={(e) => update({ website: e.target.value })} placeholder="yoursite.com" disabled={isDemo} />
          </div>
        </div>
      </section>

      {/* ── Summary ──────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 font-semibold text-slate-900">Professional Summary</h2>
        <p className="mb-3 text-sm text-slate-500">3–4 sentences about your experience, skills, and career goals.</p>
        <textarea
          className="min-h-28 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
          value={profile.summary || ""}
          onChange={(e) => update({ summary: e.target.value })}
          placeholder="Full-stack developer with 5+ years of experience building scalable web applications..."
          disabled={isDemo}
        />
      </section>

      {/* ── Skills ────────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Skills</h2>
        <div className="flex flex-wrap gap-2 mb-3 min-h-8">
          {(profile.skills || []).map((skill) => (
            <span key={skill} className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
              {skill}
              {!isDemo && (
                <button type="button" onClick={() => removeSkill(skill)} className="ml-1 hover:text-blue-900">
                  <X className="size-3" />
                </button>
              )}
            </span>
          ))}
          {profile.skills?.length === 0 && <p className="text-sm text-slate-400">No skills added yet.</p>}
        </div>
        {!isDemo && (
          <div className="flex gap-2">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
              placeholder="Type a skill and press Enter (or comma-separate multiple)"
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={addSkill}>
              <Plus className="size-4" /> Add
            </Button>
          </div>
        )}
      </section>

      {/* ── Work Experience ───────────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Briefcase className="size-4 text-slate-500" /> Work Experience
          </h2>
          {!isDemo && (
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={openAddExp}>
              <Plus className="size-4" /> Add
            </Button>
          )}
        </div>
        <div className="space-y-3">
          {profile.experience?.length === 0 && (
            <p className="text-sm text-slate-400">No experience entries yet.</p>
          )}
          {(profile.experience || []).map((exp) => (
            <div key={exp.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{exp.title} <span className="text-slate-500">@ {exp.company}</span></p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {exp.startDate} – {exp.endDate || "Present"}{exp.location ? ` · ${exp.location}` : ""}
                  </p>
                  {exp.description && <p className="mt-1.5 text-sm text-slate-600 line-clamp-3">{exp.description}</p>}
                </div>
                {!isDemo && (
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => openEditExp(exp)} className="flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-slate-700">
                      <Pencil className="size-3.5" />
                    </button>
                    <button type="button" onClick={() => removeExp(exp.id)} className="flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Education ─────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <GraduationCap className="size-4 text-slate-500" /> Education
          </h2>
          {!isDemo && (
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={openAddEdu}>
              <Plus className="size-4" /> Add
            </Button>
          )}
        </div>
        <div className="space-y-3">
          {profile.education?.length === 0 && (
            <p className="text-sm text-slate-400">No education entries yet.</p>
          )}
          {(profile.education || []).map((edu) => (
            <div key={edu.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{edu.degree}{edu.field ? ` in ${edu.field}` : ""}</p>
                  <p className="text-sm text-slate-600">{edu.institution}</p>
                  {(edu.startDate || edu.endDate) && (
                    <p className="text-xs text-slate-500 mt-0.5">{edu.startDate || ""} – {edu.endDate || "Present"}</p>
                  )}
                </div>
                {!isDemo && (
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => openEditEdu(edu)} className="flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-slate-700">
                      <Pencil className="size-3.5" />
                    </button>
                    <button type="button" onClick={() => removeEdu(edu.id)} className="flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Languages & Certifications ────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-slate-900 flex items-center gap-2">
            <Languages className="size-4 text-slate-500" /> Languages
          </h2>
          <div className="space-y-2 mb-3">
            {profile.languages?.length === 0 && <p className="text-sm text-slate-400">No languages added yet.</p>}
            {(profile.languages || []).map((l) => (
              <div key={l.language} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-sm font-medium text-slate-800">{l.language}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{l.level}</span>
                  {!isDemo && (
                    <button type="button" onClick={() => removeLang(l.language)} className="text-slate-300 hover:text-red-500">
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!isDemo && (
            <div className="flex gap-2">
              <Input value={langInput} onChange={(e) => setLangInput(e.target.value)} placeholder="Language" className="flex-1" />
              <select
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none"
                value={langLevel} onChange={(e) => setLangLevel(e.target.value)}
              >
                {LANGUAGE_LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
              <Button type="button" variant="outline" onClick={addLang}><Plus className="size-4" /></Button>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-slate-900 flex items-center gap-2">
            <BookOpen className="size-4 text-slate-500" /> Certifications
          </h2>
          <div className="space-y-2 mb-3">
            {profile.certifications?.length === 0 && <p className="text-sm text-slate-400">No certifications added yet.</p>}
            {(profile.certifications || []).map((cert) => (
              <div key={cert} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-sm text-slate-700">{cert}</span>
                {!isDemo && (
                  <button type="button" onClick={() => update({ certifications: profile.certifications.filter((c) => c !== cert) })} className="text-slate-300 hover:text-red-500">
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {!isDemo && (
            <CertInput
              onAdd={(cert) => {
                if (!profile.certifications.includes(cert)) {
                  update({ certifications: [...profile.certifications, cert] });
                }
              }}
            />
          )}
        </section>
      </div>

      {/* ── CV Text ───────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-slate-900">CV / Resume Text</h2>
          {!isDemo && (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
                <Upload className="size-4" /> Upload CV
              </Button>
            </div>
          )}
        </div>
        <p className="mb-3 text-sm text-slate-500">
          Paste your full CV text here or upload a PDF / TXT file. This text is used by the AI for job suitability checks and CV generation.
        </p>
        <textarea
          className="min-h-56 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 font-mono disabled:bg-slate-50 disabled:text-slate-500"
          value={profile.cvText || ""}
          onChange={(e) => update({ cvText: e.target.value })}
          placeholder="Paste your CV text here… or upload a PDF/TXT file above."
          disabled={isDemo}
        />
        <p className="mt-1.5 text-xs text-slate-400">
          {profile.cvText ? `${profile.cvText.length.toLocaleString()} characters` : "No CV text yet"}
        </p>
      </section>

      {/* Save button at bottom too */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isDemo} className="gap-2 bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50">
          <Save className="size-4" />
          {saved ? "Saved ✓" : "Save Profile"}
        </Button>
      </div>

      {/* ── Experience dialog ─────────────────────────────────────────────── */}
      <Dialog open={expDialog.open} onOpenChange={(open) => setExpDialog((v) => ({ ...v, open }))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{expDialog.entry ? "Edit Experience" : "Add Experience"}</DialogTitle>
            <DialogDescription>Fill in the details for this position.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleExpSave} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="expTitle">Job Title *</Label>
                <Input id="expTitle" required value={expForm.title} onChange={(e) => setExpForm((v) => ({ ...v, title: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expCompany">Company *</Label>
                <Input id="expCompany" required value={expForm.company} onChange={(e) => setExpForm((v) => ({ ...v, company: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expLocation">Location</Label>
                <Input id="expLocation" value={expForm.location} onChange={(e) => setExpForm((v) => ({ ...v, location: e.target.value }))} placeholder="Berlin, Germany" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expStart">Start Date</Label>
                <Input id="expStart" value={expForm.startDate} onChange={(e) => setExpForm((v) => ({ ...v, startDate: e.target.value }))} placeholder="2022-03" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="expEnd">End Date (leave blank for current)</Label>
                <Input id="expEnd" value={expForm.endDate} onChange={(e) => setExpForm((v) => ({ ...v, endDate: e.target.value }))} placeholder="2024-01" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="expDesc">Description / Achievements</Label>
                <textarea
                  id="expDesc"
                  className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  value={expForm.description}
                  onChange={(e) => setExpForm((v) => ({ ...v, description: e.target.value }))}
                  placeholder="Led a team of 5 engineers, improved performance by 40%..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setExpDialog({ open: false, entry: null })}>Cancel</Button>
              <Button type="submit" className="bg-blue-500 text-white hover:bg-blue-600">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Education dialog ──────────────────────────────────────────────── */}
      <Dialog open={eduDialog.open} onOpenChange={(open) => setEduDialog((v) => ({ ...v, open }))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{eduDialog.entry ? "Edit Education" : "Add Education"}</DialogTitle>
            <DialogDescription>Add your academic background.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEduSave} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="eduInstitution">Institution *</Label>
                <Input id="eduInstitution" required value={eduForm.institution} onChange={(e) => setEduForm((v) => ({ ...v, institution: e.target.value }))} placeholder="Technische Universität Berlin" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eduDegree">Degree *</Label>
                <Input id="eduDegree" required value={eduForm.degree} onChange={(e) => setEduForm((v) => ({ ...v, degree: e.target.value }))} placeholder="Master of Science" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eduField">Field of Study</Label>
                <Input id="eduField" value={eduForm.field} onChange={(e) => setEduForm((v) => ({ ...v, field: e.target.value }))} placeholder="Computer Science" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eduStart">Start Date</Label>
                <Input id="eduStart" value={eduForm.startDate} onChange={(e) => setEduForm((v) => ({ ...v, startDate: e.target.value }))} placeholder="2020-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eduEnd">End Date</Label>
                <Input id="eduEnd" value={eduForm.endDate} onChange={(e) => setEduForm((v) => ({ ...v, endDate: e.target.value }))} placeholder="2022-09" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEduDialog({ open: false, entry: null })}>Cancel</Button>
              <Button type="submit" className="bg-blue-500 text-white hover:bg-blue-600">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Small cert input component ─────────────────────────────────────────────
function CertInput({ onAdd }: { onAdd: (cert: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (value.trim()) { onAdd(value.trim()); setValue(""); } } }}
        placeholder="e.g. AWS Certified Developer"
        className="flex-1"
      />
      <Button type="button" variant="outline" onClick={() => { if (value.trim()) { onAdd(value.trim()); setValue(""); } }}>
        <Plus className="size-4" /> Add
      </Button>
    </div>
  );
}
