'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { apiFetch, getStatusClass } from '@/lib/utils';
import { Application, ApplicationStatus } from '@internai/shared';
import { KanbanCard } from '@/components/applications/KanbanCard';
import { ApplicationDrawer } from '@/components/applications/ApplicationDrawer';
import { AddApplicationModal } from '@/components/applications/AddApplicationModal';
import { Brain, Building, Calendar, GripVertical, Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const COLUMNS: { id: ApplicationStatus; title: string; color: string }[] = [
  { id: 'applied',   title: 'Applied',      color: '#60a5fa' },
  { id: 'interview', title: 'Interviewing', color: '#fbbf24' },
  { id: 'offer',     title: 'Offers',       color: '#34d399' },
  { id: 'rejected',  title: 'Rejected',     color: '#f87171' },
];

// Map any sub-status to its kanban column
function getColumnId(status: ApplicationStatus): ApplicationStatus {
  if (['screening', 'technical', 'final_round'].includes(status)) return 'interview';
  if (['draft', 'withdrawn'].includes(status)) return 'applied';
  return status;
}

function DroppableColumn({
  id,
  title,
  color,
  items,
  onCardClick,
}: {
  id: ApplicationStatus;
  title: string;
  color: string;
  items: Application[];
  onCardClick: (app: Application) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className="w-[300px] flex flex-col shrink-0"
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between mb-3 px-1"
        style={{ borderBottom: `2px solid ${color}33`, paddingBottom: 10 }}
      >
        <h3 className="font-bold flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
          {title}
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: `${color}22`, color }}
          >
            {items.length}
          </span>
        </h3>
      </div>

      {/* Cards */}
      <div
        className="flex-1 rounded-xl p-3 space-y-3 min-h-[200px] transition-colors"
        style={{
          background: isOver ? `${color}08` : 'var(--bg-surface)',
          border: `1px solid ${isOver ? color + '40' : 'var(--border-subtle)'}`,
        }}
      >
        <SortableContext items={items.map(a => a.id)} strategy={verticalListSortingStrategy}>
          {items.map((app) => (
            <KanbanCard key={app.id} app={app} onClick={onCardClick} />
          ))}
        </SortableContext>

        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-[var(--text-muted)] text-sm border-2 border-dashed border-[var(--border-subtle)] rounded-xl">
            <span className="text-2xl mb-1" style={{ color }}>↓</span>
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  const supabase = createClient();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeApp, setActiveApp] = useState<Application | null>(null);
  const [drawerApp, setDrawerApp] = useState<Application | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const data = await apiFetch<Application[]>('/applications', {}, session.access_token);
      setApps(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const getAppsForColumn = (colId: ApplicationStatus) =>
    apps.filter(a => getColumnId(a.status) === colId);

  const handleDragStart = (event: DragStartEvent) => {
    const app = apps.find(a => a.id === event.active.id);
    setActiveApp(app || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveApp(null);
    if (!over || active.id === over.id) return;

    // Determine new column (over could be column id or card id)
    const overId = over.id as string;
    const targetColId = (COLUMNS.find(c => c.id === overId)?.id
      || getColumnId(apps.find(a => a.id === overId)?.status ?? 'applied')) as ApplicationStatus;

    const draggedApp = apps.find(a => a.id === active.id);
    if (!draggedApp || getColumnId(draggedApp.status) === targetColId) return;

    // Optimistic update
    setApps(prev => prev.map(a => a.id === active.id ? { ...a, status: targetColId } : a));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      await apiFetch(`/applications/${active.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetColId }),
      }, session?.access_token);
      toast.success('Status updated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update status');
      // Revert
      setApps(prev => prev.map(a => a.id === active.id ? draggedApp : a));
    }
  };

  const handleStatusChange = (id: string, newStatus: ApplicationStatus) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    if (drawerApp?.id === id) setDrawerApp(prev => prev ? { ...prev, status: newStatus } : null);
  };

  const handleDelete = (id: string) => {
    setApps(prev => prev.filter(a => a.id !== id));
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 skeleton mb-8" />
        <div className="flex gap-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-[300px] h-96 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 shrink-0 min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl md:text-3xl font-bold truncate">Applications Board</h1>
          <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
            Drag to change status · {apps.length} application{apps.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={load}
            className="btn-ghost p-2.5 rounded-xl"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-gradient px-4 py-2.5 rounded-xl flex items-center gap-2 font-semibold text-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" /> New Application
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-5 h-full min-w-max">
            {COLUMNS.map(col => (
              <DroppableColumn
                key={col.id}
                id={col.id}
                title={col.title}
                color={col.color}
                items={getAppsForColumn(col.id)}
                onCardClick={(app) => setDrawerApp(app)}
              />
            ))}
          </div>

          {/* Drag Overlay — ghost card while dragging */}
          <DragOverlay>
            {activeApp ? (
              <div className="glass-card p-4 w-[280px] shadow-2xl rotate-2 border-[var(--brand-from)]">
                <h4 className="font-bold text-[15px] truncate">{activeApp.job?.title}</h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{activeApp.job?.company}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Application Drawer */}
      <ApplicationDrawer
        app={drawerApp}
        onClose={() => setDrawerApp(null)}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
      />

      {/* Add Application Modal */}
      {showAddModal && (
        <AddApplicationModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => { load(); setShowAddModal(false); }}
        />
      )}
    </div>
  );
}
