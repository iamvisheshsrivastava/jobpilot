"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Star, ExternalLink, ChevronLeft, ChevronRight, Trash2, Pencil, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { JobWithCategory, JobPriority, KANBAN_COLUMNS, KanbanColumn } from "@/lib/jobpilot-store";

const priorityColors: Record<JobPriority, string> = {
  "Super High": "bg-red-100 text-red-700 border-red-200",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Medium: "bg-blue-100 text-blue-700 border-blue-200",
  Low: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

interface JobCardProps {
  job: JobWithCategory;
  columnIndex: number;
  isDemo: boolean;
  onEdit: (job: JobWithCategory) => void;
  onDelete: (job: JobWithCategory) => void;
  onMoveLeft: (job: JobWithCategory) => void;
  onMoveRight: (job: JobWithCategory) => void;
  onToggleStar: (job: JobWithCategory) => void;
}

export default function JobCard({
  job,
  columnIndex,
  isDemo,
  onEdit,
  onDelete,
  onMoveLeft,
  onMoveRight,
  onToggleStar,
}: JobCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: job.id, data: { job } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const deadlineDate = job.deadline ? new Date(job.deadline + "T00:00:00") : null;
  const isOverdue = deadlineDate && deadlineDate < new Date() && job.status !== "Rejected" && job.status !== "Expired/Filled" && job.status !== "Not Suitable" && job.status !== "Offer";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all",
        "hover:shadow-md hover:border-slate-300",
        isDragging && "opacity-50 shadow-lg rotate-2 scale-105 z-50",
        isOverdue && "border-red-300 bg-red-50/30",
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0.5 top-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors"
      >
        <GripVertical className="size-3.5" />
      </div>

      {/* Star toggle */}
      <button
        type="button"
        onClick={() => !isDemo && onToggleStar(job)}
        className={cn(
          "absolute right-1 top-1 flex size-5 items-center justify-center rounded transition-colors",
          job.starred ? "text-amber-400" : "text-slate-200 hover:text-amber-300",
          isDemo && "cursor-default",
        )}
        aria-label={job.starred ? "Unstar" : "Star"}
      >
        <Star className="size-3" fill={job.starred ? "currentColor" : "none"} />
      </button>

      {/* Title */}
      <div className="pr-4">
        <h3 className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2">
          {job.link ? (
            <a
              href={job.link}
              target="_blank"
              rel="noreferrer"
              className="hover:text-blue-600 hover:underline inline-flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {job.title}
              <ExternalLink className="size-3 shrink-0 inline" />
            </a>
          ) : (
            job.title
          )}
        </h3>
        {job.company && (
          <p className="mt-0.5 text-xs text-slate-500 truncate">{job.company}</p>
        )}
      </div>

      {/* Priority badge */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", priorityColors[job.priority])}>
          {job.priority}
        </span>
        {deadlineDate && (
          <span className={cn("text-[10px]", isOverdue ? "text-red-500 font-medium" : "text-slate-400")}>
            {isOverdue ? "Overdue" : deadlineDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {columnIndex > 0 && (
          <button
            type="button"
            onClick={() => onMoveLeft(job)}
            className="flex size-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            title="Move left"
          >
            <ChevronLeft className="size-3.5" />
          </button>
        )}
        {columnIndex < KANBAN_COLUMNS.length - 1 && (
          <button
            type="button"
            onClick={() => onMoveRight(job)}
            className="flex size-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            title="Move right"
          >
            <ChevronRight className="size-3.5" />
          </button>
        )}
        {!isDemo && (
          <>
            <button
              type="button"
              onClick={() => onEdit(job)}
              className="flex size-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              title="Edit details"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(job)}
              className="flex size-6 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600"
              title="Delete"
            >
              <Trash2 className="size-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}