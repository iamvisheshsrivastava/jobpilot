"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  Download,
  FileText,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Category,
  createCategory,
  createJob,
  deleteCategory,
  deleteManyJobs,
  deleteJob,
  DEMO_ACCOUNT_EMAIL,
  fetchCategories,
  fetchJobs,
  findSimilarJobs,
  JobPriority,
  JOB_PRIORITIES,
  JobStatus,
  JOB_STATUSES,
  JobWithCategory,
  renameCategory,
  today,
  updateJob,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import KanbanBoard from "@/components/kanban/KanbanBoard";

const STATUS_FILTERS = ["All", ...JOB_STATUSES] as const;
const PRIORITY_FILTERS = ["All", ...JOB_PRIORITIES] as const;
const SORT_OPTIONS = ["Date Added", "Title", "Company", "Deadline", "Priority", "Status", "Starred"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

const priorityRank: Record<JobPriority, number> = {
  "Super High": 0, High: 1, Medium: 2, Low: 3,
};
const statusRank: Record<JobStatus, number> = {
  Interview: 0, Applied: 1, "Look Again": 2, "In Progress": 3,
  Offer: 4, Rejected: 5, "Not Suitable": 6, "Expired/Filled": 7,
};

// Duplicate group colours (cycling)
const DUP_COLORS = [
  "border-l-4 border-l-amber-400",
  "border-l-4 border-l-rose-400",
  "border-l-4 border-l-violet-400",
  "border-l-4 border-l-cyan-400",
  "border-l-4 border-l-emerald-400",
];

type FormState = {
  title: string; company: string; link: string; categoryId: string;
  status: JobStatus; priority: JobPriority; deadline: string; comments: string;
};

function emptyForm(categoryId = ""): FormState {
  return { title: "", company: "", link: "", categoryId, status: "In Progress", priority: "Medium", deadline: "", comments: "" };
}

function statusClass(status: JobStatus) {
  return ({
    "In Progress": "bg-orange-100 text-orange-700",
    Applied: "bg-blue-100 text-blue-700",
    Interview: "bg-violet-100 text-violet-700",
    Offer: "bg-emerald-100 text-emerald-700",
    "Look Again": "bg-amber-100 text-amber-700",
    Rejected: "bg-red-100 text-red-700",
    "Not Suitable": "bg-slate-100 text-slate-700",
    "Expired/Filled": "bg-zinc-200 text-zinc-700",
  } as Record<JobStatus, string>)[status];
}

function priorityClass(priority: JobPriority) {
  return ({
    "Super High": "bg-red-100 text-red-700",
    High: "bg-orange-100 text-orange-700",
    Medium: "bg-blue-100 text-blue-700",
    Low: "bg-emerald-100 text-emerald-700",
  } as Record<JobPriority, string>)[priority];
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

// ── Category action menu (three-dot) ────────────────────────────────────────
function CategoryMenu({
  category,
  onRename,
  onDelete,
}: {
  category: Category;
  onRename: (cat: Category) => void;
  onDelete: (cat: Category) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleOpen() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 4, left: r.right - 144 });
    }
    setOpen((v) => !v);
  }

  return (
    <div>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className="flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        aria-label="Category actions"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-md"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => { setOpen(false); onRename(category); }}
            >
              <Pencil className="size-3.5" /> Rename
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              onClick={() => { setOpen(false); onDelete(category); }}
            >
              <Trash2 className="size-3.5" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sortable column header ─────────────────────────────────────────────────
function SortableHead({
  label,
  className,
  sortBy,
  sortAsc,
  setSortBy,
  setSortAsc,
}: {
  label: SortOption;
  className?: string;
  sortBy: SortOption;
  sortAsc: boolean;
  setSortBy: (v: SortOption) => void;
  setSortAsc: (fn: (v: boolean) => boolean) => void;
}) {
  const active = sortBy === label;
  const Icon = active ? (sortAsc ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TableHead
      className={cn("cursor-pointer select-none whitespace-nowrap", className)}
      onClick={() => {
        if (sortBy === label) setSortAsc((v) => !v);
        else { setSortBy(label); setSortAsc(() => false); }
      }}
    >
      <span className={cn("inline-flex items-center gap-1", active ? "text-blue-600" : "")}>
        {label}
        <Icon className={cn("size-3.5", active ? "text-blue-500" : "text-slate-300")} />
      </span>
    </TableHead>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function JobsPage() {
  const { data: session } = useSession();
  const isDemo = session?.user?.email === DEMO_ACCOUNT_EMAIL;

  const [categories, setCategories] = useState<Category[]>([]);
  const [jobs, setJobs] = useState<JobWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const [priorityFilter, setPriorityFilter] = useState<(typeof PRIORITY_FILTERS)[number]>("All");
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("Date Added");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);

  // Bulk selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Expanded notes rows
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  // Job add/edit modal
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState("");
  const [formSimilar, setFormSimilar] = useState<JobWithCategory[]>([]);
  const [formSaving, setFormSaving] = useState(false);

  // Category dialogs
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [addCatName, setAddCatName] = useState("");
  const [addCatError, setAddCatError] = useState("");
  const [addCatSaving, setAddCatSaving] = useState(false);

  const [renameCatOpen, setRenameCatOpen] = useState(false);
  const [renameCatTarget, setRenameCatTarget] = useState<Category | null>(null);
  const [renameCatName, setRenameCatName] = useState("");
  const [renameCatError, setRenameCatError] = useState("");
  const [renameCatSaving, setRenameCatSaving] = useState(false);

  const [deleteCatOpen, setDeleteCatOpen] = useState(false);
  const [deleteCatTarget, setDeleteCatTarget] = useState<Category | null>(null);

  // Delete job dialog
  const [deleteJobTarget, setDeleteJobTarget] = useState<JobWithCategory | null>(null);

  // Bulk delete confirm
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // View mode: "list" or "kanban" (persisted to localStorage)
  const [viewMode, setViewMode] = useState<"list" | "kanban">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("jobpilot_view") as "list" | "kanban") || "list"
    }
    return "list"
  });

  useEffect(() => {
    localStorage.setItem("jobpilot_view", viewMode)
  }, [viewMode])

  // Import
  const importRef = useRef<HTMLInputElement>(null);

  // ── Duplicate group colour map ─────────────────────────────────────────────
  const dupGroupColorMap = useMemo(() => {
    const groupIds = Array.from(new Set(jobs.map((j) => j.duplicateGroupId).filter(Boolean) as string[]));
    const map = new Map<string, string>();
    groupIds.forEach((gid, i) => map.set(gid, DUP_COLORS[i % DUP_COLORS.length]));
    return map;
  }, [jobs]);

  const refresh = useCallback(async (nextActiveId?: string) => {
    setLoading(true);
    try {
      const [cats, jobsResp] = await Promise.all([
        fetchCategories(),
        fetchJobs({ limit: 1000 }),
      ]);
      setCategories(cats);
      setJobs(jobsResp.jobs);
      setActiveCategoryId((current) => {
        const preferred = nextActiveId || current;
        if (preferred && cats.some((c) => c.id === preferred)) return preferred;
        return cats[0]?.id ?? "";
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Keyboard shortcut: Esc ─────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (jobModalOpen) { setJobModalOpen(false); return; }
      if (addCatOpen) { setAddCatOpen(false); return; }
      if (renameCatOpen) { setRenameCatOpen(false); return; }
      if (deleteCatOpen) { setDeleteCatOpen(false); return; }
      if (deleteJobTarget) { setDeleteJobTarget(null); return; }
      if (bulkDeleteOpen) { setBulkDeleteOpen(false); return; }
      if (selectionMode) { setSelectionMode(false); setSelectedIds(new Set()); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jobModalOpen, addCatOpen, renameCatOpen, deleteCatOpen, deleteJobTarget, bulkDeleteOpen, selectionMode]);

  // ── Duplicate detection while typing in modal ──────────────────────────────
  useEffect(() => {
    if (!jobModalOpen) { setFormSimilar([]); return; }
    const similar = findSimilarJobs(jobs, form.title, form.link, editingId ?? undefined);
    setFormSimilar(similar);
  }, [form.title, form.link, jobs, editingId, jobModalOpen]);

  // ── Filtered + sorted jobs ─────────────────────────────────────────────────
  const visibleJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = jobs
      .filter((j) => (activeCategoryId ? j.categoryId === activeCategoryId : false))
      .filter((j) => {
        if (!query) return true;
        return [j.title, j.company, j.comments, j.notes].filter(Boolean).some((v) => v!.toLowerCase().includes(query));
      })
      .filter((j) => statusFilter === "All" || j.status === statusFilter)
      .filter((j) => priorityFilter === "All" || j.priority === priorityFilter)
      .filter((j) => !showDuplicatesOnly || !!j.duplicateGroupId);

    const dir = sortAsc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortBy === "Starred") return dir * ((b.starred ? 1 : 0) - (a.starred ? 1 : 0));
      if (sortBy === "Title") return dir * a.title.localeCompare(b.title);
      if (sortBy === "Company") return dir * (a.company || "").localeCompare(b.company || "");
      if (sortBy === "Deadline") return dir * (a.deadline || "9999-12-31").localeCompare(b.deadline || "9999-12-31");
      if (sortBy === "Priority") return dir * (priorityRank[a.priority] - priorityRank[b.priority]);
      if (sortBy === "Status") return dir * (statusRank[a.status] - statusRank[b.status]);
      // Date Added (default)
      return dir * (b.dateAdded.localeCompare(a.dateAdded) || b.createdAt.localeCompare(a.createdAt));
    });
  }, [activeCategoryId, jobs, priorityFilter, search, sortBy, sortAsc, statusFilter, showDuplicatesOnly]);

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(visibleJobs.length / PAGE_SIZE));
  const pagedJobs = visibleJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [activeCategoryId, search, statusFilter, priorityFilter, sortBy, sortAsc, showDuplicatesOnly]);

  // ── Category handlers ──────────────────────────────────────────────────────
  function openAddCat() { setAddCatName(""); setAddCatError(""); setAddCatOpen(true); }

  async function handleAddCatSubmit(e: FormEvent) {
    e.preventDefault();
    setAddCatError("");
    setAddCatSaving(true);
    const result = await createCategory(addCatName);
    setAddCatSaving(false);
    if (!result.ok) { setAddCatError(result.error ?? "Failed to create category"); return; }
    setAddCatOpen(false);
    await refresh(result.category!.id);
  }

  function openRenameCat(cat: Category) {
    setRenameCatTarget(cat); setRenameCatName(cat.name); setRenameCatError(""); setRenameCatOpen(true);
  }

  async function handleRenameCatSubmit(e: FormEvent) {
    e.preventDefault();
    if (!renameCatTarget) return;
    setRenameCatError("");
    setRenameCatSaving(true);
    const result = await renameCategory(renameCatTarget.id, renameCatName);
    setRenameCatSaving(false);
    if (!result.ok) { setRenameCatError(result.error ?? "Failed to rename"); return; }
    setRenameCatOpen(false);
    await refresh(renameCatTarget.id);
  }

  function openDeleteCat(cat: Category) { setDeleteCatTarget(cat); setDeleteCatOpen(true); }

  async function handleDeleteCatConfirm() {
    if (!deleteCatTarget) return;
    await deleteCategory(deleteCatTarget.id);
    setDeleteCatOpen(false);
    await refresh();
  }

  // ── Job handlers ───────────────────────────────────────────────────────────
  function openAddJob() {
    setEditingId(null);
    setForm(emptyForm(activeCategoryId));
    setFormError("");
    setJobModalOpen(true);
  }

  function openEditJob(job: JobWithCategory) {
    setEditingId(job.id);
    setForm({
      title: job.title, company: job.company || "", link: job.link || "",
      categoryId: job.categoryId, status: job.status, priority: job.priority,
      deadline: job.deadline || "", comments: job.comments || "",
    });
    setFormError("");
    setJobModalOpen(true);
  }

  async function handleJobSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    if (!form.categoryId) { setFormError("Choose a category before saving."); return; }
    const payload = {
      categoryId: form.categoryId, title: form.title, company: form.company,
      link: form.link, status: form.status, priority: form.priority,
      deadline: form.deadline, comments: form.comments,
    };
    setFormError("");
    setFormSaving(true);
    const result = editingId
      ? await updateJob(editingId, payload)
      : await createJob(payload);
    setFormSaving(false);
    if (!result.ok) { setFormError(result.error ?? "Failed to save"); return; }
    setJobModalOpen(false);
    await refresh(form.categoryId);
  }

  async function handleDeleteJob(job: JobWithCategory) {
    await deleteJob(job.id);
    await refresh(activeCategoryId);
  }

  // ── Star toggle ────────────────────────────────────────────────────────────
  async function handleToggleStar(job: JobWithCategory) {
    await updateJob(job.id, { starred: !job.starred });
    await refresh(activeCategoryId);
  }

  // ── Bulk select ────────────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === pagedJobs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pagedJobs.map((j) => j.id)));
    }
  }

  async function handleBulkDelete() {
    await deleteManyJobs(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSelectionMode(false);
    setBulkDeleteOpen(false);
    await refresh(activeCategoryId);
  }

  // ── Notes panel ────────────────────────────────────────────────────────────
  function toggleNotes(jobId: string, currentNotes?: string) {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) { next.delete(jobId); } else {
        next.add(jobId);
        setNoteDrafts((d) => ({ ...d, [jobId]: currentNotes || "" }));
      }
      return next;
    });
  }

  async function saveNote(job: JobWithCategory) {
    await updateJob(job.id, { notes: noteDrafts[job.id] ?? "" });
    await refresh(activeCategoryId);
  }

  // ── Excel Export ───────────────────────────────────────────────────────────
  async function exportExcel() {
    const XLSX = await import("xlsx");
    const rows = visibleJobs.map((j) => ({
      "#": j.jobNumber,
      Starred: j.starred ? "Yes" : "No",
      Title: j.title,
      Company: j.company || "",
      URL: j.link || "",
      Category: j.categoryName,
      Status: j.status,
      Priority: j.priority,
      Deadline: j.deadline || "",
      "Date Added": j.dateAdded,
      Comments: j.comments || "",
      Notes: j.notes || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jobs");
    XLSX.writeFile(wb, `jobpilot-${today()}.xlsx`);
  }

  // ── Excel Import ───────────────────────────────────────────────────────────
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const [importError, setImportError] = useState("");
  const [importMapping, setImportMapping] = useState<Record<string, string>>({});

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
      if (!rows.length) { setImportError("The spreadsheet is empty."); return; }
      setImportRows(rows);
      const headers = Object.keys(rows[0]);
      const autoMap: Record<string, string> = {};
      const match = (targets: string[]) =>
        headers.find((h) => targets.some((t) => h.toLowerCase().includes(t))) || "";
      autoMap.title = match(["title", "job title", "position", "role"]);
      autoMap.company = match(["company", "employer", "organization"]);
      autoMap.link = match(["link", "url", "href"]);
      autoMap.status = match(["status"]);
      autoMap.priority = match(["priority"]);
      autoMap.deadline = match(["deadline", "due", "apply by"]);
      autoMap.comments = match(["comments", "notes", "description"]);
      setImportMapping(autoMap);
      setImportError("");
      setImportModalOpen(true);
    } catch {
      setImportError("Could not read the file. Make sure it's a valid .xlsx file.");
    }
    e.target.value = "";
  }

  async function handleImportConfirm() {
    if (!activeCategoryId) return;
    let count = 0;
    for (const row of importRows) {
      const title = row[importMapping.title]?.toString().trim();
      if (!title) continue;
      const rawStatus = row[importMapping.status]?.toString().trim() as JobStatus;
      const rawPriority = row[importMapping.priority]?.toString().trim() as JobPriority;
      await createJob({
        categoryId: activeCategoryId,
        title,
        company: row[importMapping.company]?.toString().trim() || undefined,
        link: row[importMapping.link]?.toString().trim() || undefined,
        status: (JOB_STATUSES as readonly string[]).includes(rawStatus) ? rawStatus : "In Progress",
        priority: (JOB_PRIORITIES as readonly string[]).includes(rawPriority) ? rawPriority : "Medium",
        deadline: row[importMapping.deadline]?.toString().trim() || undefined,
        comments: row[importMapping.comments]?.toString().trim() || undefined,
      });
      count++;
    }
    setImportModalOpen(false);
    await refresh(activeCategoryId);
    alert(`Imported ${count} job${count === 1 ? "" : "s"} into the active category.`);
  }

  // ── Sort icon ──────────────────────────────────────────────────────────────
  const SortIcon = sortAsc ? ArrowUp : ArrowDown;

  if (loading && categories.length === 0) {
    return <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      {/* hidden file input for import */}
      <input
        ref={importRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleImportFile}
      />

      {/* ── Categories ──────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 px-3 py-2.5">
          {categories.length === 0 ? (
            <p className="px-2 text-sm text-slate-400">No categories yet — add one to start.</p>
          ) : (
            categories.map((cat) => (
              <div
                key={cat.id}
                className={cn(
                  "flex shrink-0 items-center gap-0.5 rounded-lg border px-1",
                  activeCategoryId === cat.id ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50",
                )}
              >
                <button
                  type="button"
                  className={cn(
                    "h-8 px-2.5 text-sm font-medium",
                    activeCategoryId === cat.id ? "text-blue-700" : "text-slate-600",
                  )}
                  onClick={() => setActiveCategoryId(cat.id)}
                >
                  {cat.name}
                </button>
                {!isDemo && (
                  <CategoryMenu category={cat} onRename={openRenameCat} onDelete={openDeleteCat} />
                )}
              </div>
            ))
          )}
          {!isDemo && (
            <Button variant="outline" className="ml-auto shrink-0 gap-1.5 text-sm" onClick={openAddCat}>
              <Plus className="size-4" /> Add Category
            </Button>
          )}
        </div>

        {/* ── Filter bar ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-[160px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-8 pr-8" placeholder="Search title, company, notes…" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <select
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-blue-400"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            {STATUS_FILTERS.map((o) => <option key={o}>{o}</option>)}
          </select>

          <select
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-blue-400"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}
          >
            {PRIORITY_FILTERS.map((o) => <option key={o}>{o}</option>)}
          </select>

          <div className="flex items-center gap-1">
            <select
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-blue-400"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              {SORT_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
            <button
              type="button"
              title={sortAsc ? "Ascending" : "Descending"}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              onClick={() => setSortAsc((v) => !v)}
            >
              <SortIcon className="size-4" />
            </button>
          </div>

          <button
            type="button"
            title="Show duplicates only"
            onClick={() => setShowDuplicatesOnly((v) => !v)}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
              showDuplicatesOnly
                ? "border-amber-400 bg-amber-50 text-amber-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            <ArrowUpDown className="size-4" /> Duplicates
          </button>

          {!isDemo && (
            <button
              type="button"
              onClick={() => { setSelectionMode((v) => !v); setSelectedIds(new Set()); }}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
                selectionMode
                  ? "border-blue-400 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              Select
            </button>
          )}

          {selectionMode && selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setBulkDeleteOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 text-sm text-red-600 hover:bg-red-100"
            >
              <Trash2 className="size-4" /> Delete {selectedIds.size}
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            {!isDemo ? (
              <Button className="gap-1.5 bg-blue-500 text-white hover:bg-blue-600" onClick={openAddJob}>
                <Plus className="size-4" /> Add Job
              </Button>
            ) : (
              <span className="flex h-8 items-center rounded-lg border border-dashed border-slate-300 px-3 text-xs text-slate-400">Read-only demo</span>
            )}
            {!isDemo && (
              <Button variant="outline" className="gap-1.5" title="Import from Excel" onClick={() => importRef.current?.click()}>
                <Upload className="size-4" /> Import
              </Button>
            )}
            <Button variant="outline" className="gap-1.5" onClick={exportExcel}>
              <Download className="size-4" /> Export
            </Button>
          </div>
        </div>
      </section>

      {/* ── View switcher ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
            )}
          >
            <List className="size-4" /> List
          </button>
          <button
            type="button"
            onClick={() => setViewMode("kanban")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              viewMode === "kanban" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
            )}
          >
            <Columns3 className="size-4" /> Kanban
          </button>
        </div>
      </div>

      {/* ── Kanban Board ──────────────────────────────────────────────────── */}
      {viewMode === "kanban" && (
        <KanbanBoard
          jobs={jobs}
          categories={categories}
          activeCategoryId={activeCategoryId}
          user={session?.user ? { id: (session.user as any).id ?? '' } : null}
          isDemo={isDemo}
          search={search}
          priorityFilter={priorityFilter}
          showStarredOnly={false}
          onRefresh={() => refresh(activeCategoryId)}
          onOpenAddJob={openAddJob}
        />
      )}

      {/* ── Jobs table ───────────────────────────────────────────────────── */}
      {viewMode === "list" && (
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {selectionMode && (
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={pagedJobs.length > 0 && selectedIds.size === pagedJobs.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300"
                    />
                  </TableHead>
                )}
                <TableHead
                  className="w-10 cursor-pointer select-none"
                  onClick={() => { if (sortBy === "Starred") setSortAsc((v) => !v); else { setSortBy("Starred"); setSortAsc(() => false); } }}
                  title="Sort by starred"
                >
                  <span className={cn("inline-flex items-center gap-1", sortBy === "Starred" ? "text-blue-600" : "")}>
                    ⭐{sortBy === "Starred" && (sortAsc ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                  </span>
                </TableHead>
                <TableHead className="w-16">#</TableHead>
                <SortableHead label="Title" sortBy={sortBy} sortAsc={sortAsc} setSortBy={setSortBy} setSortAsc={setSortAsc} />
                <SortableHead label="Company" sortBy={sortBy} sortAsc={sortAsc} setSortBy={setSortBy} setSortAsc={setSortAsc} />
                <SortableHead label="Status" sortBy={sortBy} sortAsc={sortAsc} setSortBy={setSortBy} setSortAsc={setSortAsc} />
                <SortableHead label="Priority" sortBy={sortBy} sortAsc={sortAsc} setSortBy={setSortBy} setSortAsc={setSortAsc} />
                <SortableHead label="Deadline" sortBy={sortBy} sortAsc={sortAsc} setSortBy={setSortBy} setSortAsc={setSortAsc} />
                <SortableHead label="Date Added" sortBy={sortBy} sortAsc={sortAsc} setSortBy={setSortBy} setSortAsc={setSortAsc} />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={selectionMode ? 10 : 9} className="h-32 text-center text-slate-400">
                    {categories.length === 0 ? "Create a category to start tracking jobs." : "No jobs match this view."}
                  </TableCell>
                </TableRow>
              ) : (
                pagedJobs.map((job) => {
                  const dupColor = job.duplicateGroupId ? dupGroupColorMap.get(job.duplicateGroupId) : undefined;
                  const notesOpen = expandedNotes.has(job.id);
                  return (
                    <>
                      <TableRow
                        key={job.id}
                        className={cn(dupColor, selectedIds.has(job.id) && "bg-blue-50")}
                      >
                        {selectionMode && (
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(job.id)}
                              onChange={() => toggleSelect(job.id)}
                              className="rounded border-slate-300"
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => !isDemo && handleToggleStar(job)}
                            className={cn(
                              "flex size-6 items-center justify-center rounded transition-colors",
                              job.starred ? "text-amber-400" : "text-slate-300 hover:text-amber-300",
                              isDemo && "cursor-default",
                            )}
                            aria-label={job.starred ? "Unstar" : "Star"}
                          >
                            <Star className="size-4" fill={job.starred ? "currentColor" : "none"} />
                          </button>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-400">#{job.jobNumber}</TableCell>
                        <TableCell className="min-w-56">
                          {job.link ? (
                            <a href={job.link} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline">{job.title}</a>
                          ) : (
                            <span className="font-medium text-slate-800">{job.title}</span>
                          )}
                          {job.duplicateGroupId && (
                            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">duplicate</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-600">{job.company || "-"}</TableCell>
                        <TableCell><Badge className={cn("text-xs", statusClass(job.status))}>{job.status}</Badge></TableCell>
                        <TableCell><Badge className={cn("text-xs", priorityClass(job.priority))}>{job.priority}</Badge></TableCell>
                        <TableCell className="text-slate-600">{formatDate(job.deadline)}</TableCell>
                        <TableCell className="text-slate-600">{formatDate(job.dateAdded)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => toggleNotes(job.id, job.notes)}
                              className={cn(
                                "flex size-7 items-center justify-center rounded-md transition-colors",
                                notesOpen ? "bg-blue-100 text-blue-600" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
                              )}
                              aria-label="Notes"
                            >
                              <FileText className="size-3.5" />
                            </button>
                            {!isDemo && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditJob(job)}
                                  className="flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                  aria-label="Edit"
                                >
                                  <Pencil className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteJobTarget(job)}
                                  className="flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
                                  aria-label="Delete"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {notesOpen && (
                        <TableRow key={`${job.id}-notes`} className="bg-slate-50">
                          <TableCell colSpan={selectionMode ? 10 : 9} className="py-2 px-4">
                            <div className="flex flex-col gap-2">
                              <Label className="text-xs text-slate-500">Notes for &ldquo;{job.title}&rdquo;</Label>
                              <textarea
                                className="min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                placeholder="Write your notes here… (auto-saved on Save)"
                                value={noteDrafts[job.id] ?? job.notes ?? ""}
                                readOnly={isDemo}
                                onChange={(e) => setNoteDrafts((d) => ({ ...d, [job.id]: e.target.value }))}
                              />
                              {!isDemo && (
                                <div className="flex gap-2">
                                  <Button size="sm" className="bg-blue-500 text-white hover:bg-blue-600 text-xs" onClick={() => saveNote(job)}>
                                    Save Note
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-xs" onClick={() => toggleNotes(job.id)}>
                                    Close
                                  </Button>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {visibleJobs.length} job{visibleJobs.length === 1 ? "" : "s"} found
            {selectionMode && selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((v) => Math.max(1, v - 1))}>Previous</Button>
            <span>Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((v) => Math.min(totalPages, v + 1))}>Next</Button>
          </div>
        </div>
      </section>
      )}

      {/* ── Add Category dialog ──────────────────────────────────────────── */}
      <Dialog open={addCatOpen} onOpenChange={setAddCatOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>Group your jobs by role type, country, or company.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCatSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="catName">Name</Label>
              <Input id="catName" autoFocus required value={addCatName} onChange={(e) => setAddCatName(e.target.value)} placeholder="e.g. Germany - Software" />
            </div>
            {addCatError && <p className="text-sm text-red-600">{addCatError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddCatOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-500 text-white hover:bg-blue-600" disabled={addCatSaving}>Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Rename Category dialog ───────────────────────────────────────── */}
      <Dialog open={renameCatOpen} onOpenChange={setRenameCatOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Category</DialogTitle>
            <DialogDescription>Update the name for &ldquo;{renameCatTarget?.name}&rdquo;.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenameCatSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="renameCatName">New name</Label>
              <Input id="renameCatName" autoFocus required value={renameCatName} onChange={(e) => setRenameCatName(e.target.value)} />
            </div>
            {renameCatError && <p className="text-sm text-red-600">{renameCatError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenameCatOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-500 text-white hover:bg-blue-600" disabled={renameCatSaving}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Category dialog ───────────────────────────────────────── */}
      <Dialog open={deleteCatOpen} onOpenChange={setDeleteCatOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Delete &ldquo;{deleteCatTarget?.name}&rdquo;?{" "}
              {(() => {
                const count = jobs.filter((j) => j.categoryId === deleteCatTarget?.id).length;
                return count > 0 ? `This will also delete ${count} job${count === 1 ? "" : "s"}.` : "This category is empty.";
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteCatOpen(false)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleDeleteCatConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Job confirm dialog ────────────────────────────────────── */}
      <Dialog open={!!deleteJobTarget} onOpenChange={(open) => !open && setDeleteJobTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Job</DialogTitle>
            <DialogDescription>Delete &ldquo;{deleteJobTarget?.title}&rdquo;? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteJobTarget(null)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={() => { if (deleteJobTarget) { handleDeleteJob(deleteJobTarget); setDeleteJobTarget(null); } }}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Delete confirm dialog ───────────────────────────────────── */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} Jobs</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.size} selected job{selectedIds.size === 1 ? "" : "s"}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBulkDeleteOpen(false)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleBulkDelete}>Delete All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add / Edit Job dialog ────────────────────────────────────────── */}
      <Dialog open={jobModalOpen} onOpenChange={setJobModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Job" : "Add Job"}</DialogTitle>
            <DialogDescription>Track the core details, priority, deadline, and notes.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleJobSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={form.title} onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company">Company</Label>
                <Input id="company" value={form.company} onChange={(e) => setForm((v) => ({ ...v, company: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="url">URL</Label>
                <Input id="url" type="url" value={form.link} onChange={(e) => setForm((v) => ({ ...v, link: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="catSelect">Category</Label>
                <select
                  id="catSelect"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                  value={form.categoryId}
                  onChange={(e) => setForm((v) => ({ ...v, categoryId: e.target.value }))}
                >
                  <option value="">Choose category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                  value={form.status}
                  onChange={(e) => setForm((v) => ({ ...v, status: e.target.value as JobStatus }))}
                >
                  {JOB_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                  value={form.priority}
                  onChange={(e) => setForm((v) => ({ ...v, priority: e.target.value as JobPriority }))}
                >
                  {JOB_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deadline">Deadline</Label>
                <Input id="deadline" type="date" value={form.deadline} onChange={(e) => setForm((v) => ({ ...v, deadline: e.target.value }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="comments">Comments</Label>
                <textarea
                  id="comments"
                  className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  value={form.comments}
                  onChange={(e) => setForm((v) => ({ ...v, comments: e.target.value }))}
                />
              </div>
            </div>

            {formSimilar.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <p className="font-medium mb-1">⚠ Similar job{formSimilar.length > 1 ? "s" : ""} already exist{formSimilar.length === 1 ? "s" : ""}:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {formSimilar.slice(0, 3).map((j) => (
                    <li key={j.id}>
                      <strong>{j.title}</strong> in <em>{j.categoryName}</em>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setJobModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-500 text-white hover:bg-blue-600" disabled={formSaving}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Import mapping dialog ────────────────────────────────────────── */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Jobs from Excel</DialogTitle>
            <DialogDescription>
              {importRows.length} rows found. Map your columns to JobPilot fields, then click Import.
            </DialogDescription>
          </DialogHeader>
          {importError && <p className="text-sm text-red-600">{importError}</p>}
          <div className="space-y-3">
            {(["title", "company", "link", "status", "priority", "deadline", "comments"] as const).map((field) => {
              const headers = importRows.length ? Object.keys(importRows[0]) : [];
              return (
                <div key={field} className="flex items-center gap-3">
                  <Label className="w-24 shrink-0 capitalize text-slate-600">{field}</Label>
                  <select
                    className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                    value={importMapping[field] || ""}
                    onChange={(e) => setImportMapping((m) => ({ ...m, [field]: e.target.value }))}
                  >
                    <option value="">(skip)</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-2">Will import into: <strong>{categories.find((c) => c.id === activeCategoryId)?.name || "active category"}</strong></p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImportModalOpen(false)}>Cancel</Button>
            <Button type="button" className="bg-blue-500 text-white hover:bg-blue-600" onClick={handleImportConfirm}>
              Import {importRows.length} rows
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
