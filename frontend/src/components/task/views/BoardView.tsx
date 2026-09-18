import { useState } from 'react';
import {
  DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import type { ProjectDTO, TaskDTO } from '../../../types';
import { TASK_STATUSES, STATUS_META } from '../../../constants';
import TaskRow from '../TaskRow';

interface BoardViewProps {
  tasks: TaskDTO[];
  projects: ProjectDTO[];
  onOpen: (id: number) => void;
  onToggle: (task: TaskDTO) => void;
  onStatusChange: (task: TaskDTO, status: string) => void;
}

function DraggableCard({
  task,
  projects,
  onOpen,
  onToggle
}: {
  task: TaskDTO;
  projects: ProjectDTO[];
  onOpen: (id: number) => void;
  onToggle: (task: TaskDTO) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={isDragging ? 'opacity-40' : ''}>
      <TaskRow task={task} projects={projects} onOpen={onOpen} onToggle={onToggle} />
    </div>
  );
}

function Column({
  status,
  tasks,
  projects,
  onOpen,
  onToggle,
  dragging
}: {
  status: string;
  tasks: TaskDTO[];
  projects: ProjectDTO[];
  onOpen: (id: number) => void;
  onToggle: (task: TaskDTO) => void;
  dragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${status}` });
  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-xl border transition-colors ${
        isOver && dragging ? 'border-accent bg-accent-soft/60' : 'border-line bg-surface-2/60'
      }`}
    >
      <div className="flex items-center gap-2 px-3.5 py-3">
        <span className={`h-2 w-2 rounded-full ${STATUS_META[status]?.bg ?? ''} ${STATUS_META[status]?.color ?? ''}`} />
        <span className="text-sm font-semibold text-t1">{status}</span>
        <span className="ml-auto rounded-full bg-surface-3 px-1.5 text-xs text-t3">{tasks.length}</span>
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto px-2 pb-2">
        {tasks.map((t) => (
          <DraggableCard key={t.id} task={t} projects={projects} onOpen={onOpen} onToggle={onToggle} />
        ))}
        {tasks.length === 0 && (
          <p className="py-6 text-center text-xs text-t3">拖拽任务到这里</p>
        )}
      </div>
    </div>
  );
}

export default function BoardView({ tasks, projects, onOpen, onToggle, onStatusChange }: BoardViewProps) {
  const [dragging, setDragging] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragStart = () => setDragging(true);

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(false);
    const over = e.over?.id as string | undefined;
    if (!over) return;
    const status = over.replace('col-', '');
    const task = tasks.find((t) => t.id === Number(e.active.id));
    if (task && task.status !== status) onStatusChange(task, status);
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-3">
        {TASK_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={tasks.filter((t) => t.status === status)}
            projects={projects}
            onOpen={onOpen}
            onToggle={onToggle}
            dragging={dragging}
          />
        ))}
      </div>
    </DndContext>
  );
}
