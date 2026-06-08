"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Search, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  JobWithCategory,
  KANBAN_COLUMNS,
  KanbanColumn,
  KANBAN_TO_STATUSES,
  KANBAN_HEADER_COLORS,
  STATUS_TO_KANBAN,
  updateJob,
  deleteJob,
  toggleStarJob,
  getCurrentUser,
  isDemoAccount,
  Category,
  JobPriority,
  JOB_PRIORITIES,
} from "@/lib/jobpilot-store";
import JobCard from "./JobCard";
import JobDetailDrawer from "./JobDetailDrawer";

interface KanbanBoardProps {
  jobs: JobWithCategory[];
  categories: Category[];
  activeCategoryId: string;
  user: { id: string } | null;
  isDemo: boolean;
  search: string;
  priorityFilter: string;
  showStarredOnly: boolean;
  onRefresh: () => void;
  onOpenAddJob: () => void;
}

const priorityRank: Record<JobPriority, number> = {
  "Super High": 0, High: 1, Medium: 2, Low: 3,
};

function sortCards(a: JobWithCategory, b: JobWithCategory): number {
  // Starred first
  if (a.starred && !b.starred) return -1;
  if (!a.starred && b.starred) return 1;
  // Priority
  const pDiff = (priorityRank[a.priority] ?? 99) - (priorityRank[b.priority] ?? 99);
  if (pDiff !== 0) return pDiff;
  // Closest deadline
  const da = a.deadline || "9999-12-31";
  const db = b.deadline || "9999-12-31";
  if (da !== db) return da < db ? -1 : 1;
  // Most recently added
  return b.dateAdded.localeCompare(a.dateAdded);
}

export default function KanbanBoard({
  jobs,
  categories,
  activeCategoryId,
  user,
  isDemo,
  search,
  priorityFilter,
  showStarredOnly,
  onRefresh,
  onOpenAddJob,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drawerJob, setDrawerJob] = useState<JobWithCategory | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  // Filter jobs
  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return jobs.filter((j) => {
      // Category filter
      if (activeCategoryId && j.categoryId !== activeCategoryId) return false;
      // Search
      if (query && ![j.title, j.company, j.comments, j.notes].filter(Boolean).some((v) => v!.toLowerCase().includes(query))) return false;
      // Priority filter
      if (priorityFilter !== "All" && j.priority !== priorityFilter) return false;
      // Starred only
      if (showStarredOnly && !j.starred) return false;
      return true;
    });
  }, [jobs, activeCategoryId, search, priorityFilter, showStarredOnly]);

  // Group by Kanban column
  const columns = useMemo(() => {
    const map = new Map<KanbanColumn, JobWithCategory[]>();
    for (const col of KANBAN_COLUMNS) {
      map.set(col, []);
    }
    for (const job of filteredJobs) {
      const col = STATUS_TO_KANBAN[job.status] || "Saved";
      map.get(col)?.push(job);
    }
    // Sort each column
    for (const col of KANBAN_COLUMNS) {
      const cards = map.get(col)!;
      cards.sort(sortCards);
    }
    return map;
  }, [filteredJobs]);

  // Find which column a job belongs to
  function getColumn(jobId: string): KanbanColumn | null {
    const job = filteredJobs.find((j) => j.id === jobId);
    if (!job) return null;
    return STATUS_TO_KANBAN[job.status] || "Saved";
  }

  // Handle drag start
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  // Handle drag end
  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !user) return;

    const activeJob = filteredJobs.find((j) => j.id === active.id);
    if (!activeJob) return;

    // Determine target column
    let targetColumn: KanbanColumn | null = null;

    // Check if dropped over a column (the droppable id is the column name)
    if (KANBAN_COLUMNS.includes(over.id as KanbanColumn)) {
      targetColumn = over.id as KanbanColumn;
    } else {
      // Dropped over another card — find that card's column
      const overJob = filteredJobs.find((j) => j.id === over.id);
      if (overJob) {
        targetColumn = STATUS_TO_KANBAN[overJob.status] || "Saved";
      }
    }

    if (!targetColumn) return;

    const currentColumn = STATUS_TO_KANBAN[activeJob.status] || "Saved";
    if (targetColumn === currentColumn) return;

    // Map target column to first status
    const targetStatuses = KANBAN_TO_STATUSES[targetColumn];
    if (!targetStatuses.length) return;

    updateJob(user.id, activeJob.id, { status: targetStatuses[0] });
    onRefresh();
  }

  // Move left/right
  function handleMove(job: JobWithCategory, direction: -1 | 1) {
    if (!user || isDemo) return;
    const currentCol = STATUS_TO_KANBAN[job.status] || "Saved";
    const idx = KANBAN_COLUMNS.indexOf(currentCol);
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= KANBAN_COLUMNS.length) return;
    const nextCol = KANBAN_COLUMNS[nextIdx];
    const targetStatuses = KANBAN_TO_STATUSES[nextCol];
    if (!targetStatuses.length) return;
    updateJob(user.id, job.id, { status: targetStatuses[0] });
    onRefresh();
  }

  function handleDelete(job: JobWithCategory) {
    if (!user || isDemo) return;
    if (window.confirm(`Delete "${job.title}"? This cannot be undone.`)) {
      deleteJob(user.id, job.id);
      onRefresh();
    }
  }

  function handleToggleStar(job: JobWithCategory) {
    if (!user || isDemo) return;
    toggleStarJob(user.id, job.id);
    onRefresh();
  }

  function handleOpenDrawer(job: JobWithCategory) {
    setDrawerJob(job);
    setDrawerOpen(true);
  }

  // Active job for drag overlay
  const activeJob = activeId ? filteredJobs.find((j) => j.id === activeId) : null;

  // Summary counts
  const summary = useMemo(() => {
    const counts: Record<KanbanColumn, number> = { Saved: 0, Applied: 0, Interview: 0, Offer: 0, Rejected: 0 };
    for (const job of filteredJobs) {
      const col = STATUS_TO_KANBAN[job.status] || "Saved";
      counts[col]++;
    }
    return counts;
  }, [filteredJobs]);

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
        {KANBAN_COLUMNS.map((col) => (
          <div key={col} className="flex items-center gap-1.5">
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", KANBAN_HEADER_COLORS[col])}>
              {col}
            </span>
            <span className="text-sm font-semibold text-slate-700">{summary[col]}</span>
            {col !== "Rejected" && <span className="text-slate-300 mx-1">·</span>}
          </div>
        ))}
        <div className="ml-auto text-xs text-slate-400">
          {filteredJobs.length} job{filteredJobs.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Kanban board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none">
          {KANBAN_COLUMNS.map((col, colIdx) => {
            const cards = columns.get(col) || [];
            return (
              <div
                key={col}
                className="flex flex-col min-w-[260px] w-[260px] md:w-72 snap-start shrink-0"
              >
                {/* Column header */}
                <div className={cn("flex items-center justify-between rounded-t-xl px-3 py-2", KANBAN_HEADER_COLORS[col])}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{col}</span>
                    <span className="text-xs font-medium opacity-70">{cards.length}</span>
                  </div>
                </div>

                {/* Column body (droppable) */}
                <div
                  className={cn(
                    "flex-1 rounded-b-xl border border-t-0 border-slate-200 p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-280px)] overflow-y-auto",
                    "bg-slate-50/50",
                  )}
                >
                  <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                    {cards.length === 0 ? (
                      <div className="flex h-24 items-center justify-center text-xs text-slate-400">
                        Drop jobs here
                      </div>
                    ) : (
                      cards.map((job) => (
                        <div key={job.id} onClick={() => handleOpenDrawer(job)}>
                          <JobCard
                            job={job}
                            columnIndex={colIdx}
                            isDemo={isDemo}
                            onEdit={handleOpenDrawer}
                            onDelete={handleDelete}
                            onMoveLeft={(j) => handleMove(j, -1)}
                            onMoveRight={(j) => handleMove(j, 1)}
                            onToggleStar={handleToggleStar}
                          />
                        </div>
                      ))
                    )}
                  </SortableContext>
                </div>
              </div>
            );
          })}
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeJob ? (
            <div className="rounded-lg border border-blue-300 bg-white p-3 shadow-xl rotate-2 scale-105 w-[260px]">
              <p className="text-sm font-semibold text-slate-800">{activeJob.title}</p>
              {activeJob.company && <p className="text-xs text-slate-500 mt-0.5">{activeJob.company}</p>}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Detail drawer */}
      <JobDetailDrawer
        job={drawerJob}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setDrawerJob(null); }}
        onSaved={onRefresh}
      />
    </div>
  );
}