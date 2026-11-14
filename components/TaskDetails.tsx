'use client';

import { useId, useMemo } from 'react';
import { ArrowUpRight, CheckCheck, Circle, CircleCheck, ListTodo, LoaderCircle, Plus, SquareCheck, X } from 'lucide-react';
import { taskProgress } from '@/lib/node-features';
import type { GraphNode, Language, TaskStatus, Workspace } from '@/lib/types';

interface TaskDetailsProps {
  node: GraphNode;
  document: Workspace;
  language: Language;
  onSelect: (id: string) => void;
  onTaskStatus?: (id: string, status: TaskStatus) => void;
  onMakeTask?: () => void;
  onRemoveTask?: () => void;
  onAddSubtask?: () => void;
  onToggleSubtask?: (id: string) => void;
}

const statuses: TaskStatus[] = ['todo', 'doing', 'done'];
const statusNames: Record<TaskStatus, [string, string]> = {
  todo: ['انجام‌نشده', 'To do'],
  doing: ['در حال انجام', 'In progress'],
  done: ['انجام‌شده', 'Done'],
};
const statusIcons = { todo: Circle, doing: LoaderCircle, done: CircleCheck };

export default function TaskDetails({ node, document, language, onSelect, onTaskStatus, onMakeTask, onRemoveTask, onAddSubtask, onToggleSubtask }: TaskDetailsProps) {
  const L = (fa: string, en: string) => language === 'fa' ? fa : en;
  const radioId = useId();
  const children = useMemo(() => document.nodes.filter(item => item.boardId === node.boardId && item.task?.parentId === node.id), [document.nodes, node.id, node.boardId]);
  const progress = useMemo(() => node.task ? taskProgress(document, node.id) : { done: 0, total: 0, percent: 0 }, [document, node.id, node.task]);
  const parent = node.task?.parentId ? document.nodes.find(item => item.id === node.task!.parentId) : null;

  return <section className="nd-section nd-task-section" aria-labelledby={`${radioId}-heading`}>
    <div className="nd-section-heading"><h3 id={`${radioId}-heading`}><ListTodo size={16} />{L('وظیفه و زیرکارها', 'Task & subtasks')}</h3>{node.task && <span className={`nd-status-label nd-status-${node.task.status}`}>{statusNames[node.task.status][language === 'fa' ? 0 : 1]}</span>}</div>
    {!node.task ? <>
      <p className="nd-helper">{L('این فکر را به یک کار قابل پیگیری تبدیل کن.', 'Turn this thought into something you can track.')}</p>
      <button className="nd-action nd-action-wide" type="button" onClick={onMakeTask} disabled={!onMakeTask}><SquareCheck size={16} />{L('تبدیل به وظیفه', 'Make this a task')}</button>
    </> : <>
      <fieldset className="nd-task-status"><legend className="sr-only">{L('وضعیت وظیفه', 'Task status')}</legend>{statuses.map(status => {
        const Icon = statusIcons[status];
        return <label className={`nd-task-radio nd-status-${status}`} key={status}>
          <input type="radio" name={radioId} value={status} checked={node.task!.status === status} disabled={!onTaskStatus} onChange={() => onTaskStatus?.(node.id, status)} />
          <span><Icon size={14} />{statusNames[status][language === 'fa' ? 0 : 1]}</span>
        </label>;
      })}</fieldset>
      {parent && <button className="nd-task-parent" type="button" onClick={() => onSelect(parent.id)}><span>{L('زیرکارِ', 'Part of')}</span><strong dir="auto">{parent.title || L('بدون عنوان', 'Untitled')}</strong><ArrowUpRight size={14} /></button>}
      {progress.total > 0 && <div className="nd-task-progress">
        <div><span><CheckCheck size={14} />{L('پیشرفت همهٔ زیرکارها', 'Progress across all subtasks')}</span><strong>{progress.done} / {progress.total}</strong></div>
        <progress value={progress.done} max={progress.total} aria-label={L('زیرکارهای انجام‌شده', 'Completed subtasks')} />
      </div>}
      <div className="nd-subtask-heading"><span>{L('زیرکارهای مستقیم', 'Direct subtasks')}</span><span>{children.length}</span></div>
      {children.length > 0 ? <ul className="nd-subtask-list">{children.map(child => <li key={child.id}>
        <input type="checkbox" checked={child.task!.status === 'done'} onChange={() => onToggleSubtask?.(child.id)} disabled={!onToggleSubtask} aria-label={`${child.task!.status === 'done' ? L('بازگردانی به انجام‌نشده', 'Mark as to do') : L('علامت‌زدن به‌عنوان انجام‌شده', 'Mark as done')}: ${child.title || L('بدون عنوان', 'Untitled')}`} />
        <button type="button" className="nd-subtask-title" onClick={() => onSelect(child.id)}><span dir="auto">{child.title || L('بدون عنوان', 'Untitled')}</span><small className={`nd-status-${child.task!.status}`}>{statusNames[child.task!.status][language === 'fa' ? 0 : 1]}</small></button>
        <ArrowUpRight size={13} aria-hidden="true" />
      </li>)}</ul> : <p className="nd-empty-copy">{L('هنوز زیرکاری اضافه نشده است.', 'No subtasks yet.')}</p>}
      <button className="nd-action nd-action-wide" type="button" onClick={onAddSubtask} disabled={!onAddSubtask}><Plus size={15} />{L('افزودن زیرکار', 'Add subtask')}</button>
      <button className="nd-quiet-action" type="button" onClick={onRemoveTask} disabled={!onRemoveTask} title={L('محتوا باقی می‌ماند و زیرکارها مستقل می‌شوند.', 'Content stays; its subtasks become independent tasks.')}><X size={13} />{L('برداشتن حالت وظیفه', 'Remove task tracking')}</button>
    </>}
  </section>;
}
