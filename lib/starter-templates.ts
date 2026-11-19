import { makeNode, uid } from './graph';
import type { Board, GraphEdge, GraphNode, Language, NodeColor, NodeKind, TaskStatus, Workspace } from './types';

type Text = { fa: string; en: string };
type Item = { title: Text; parent?: number; depth: number; row: number; color: NodeColor; kind?: NodeKind; status?: TaskStatus; note?: Text };
type Definition = { title: Text; description: Text; items: readonly Item[] };
export const STARTER_TEMPLATES = {
  brainstorm: {
    title: { fa: 'طوفان فکری', en: 'Brainstorm' },
    description: { fa: 'از یک پرسش به مسیرها و آزمایش‌های تازه برس.', en: 'Explore a question, options, and experiments.' },
    items: [
      { title: { fa: 'پرسش اصلی', en: 'Core question' }, depth: 0, row: 0, color: 'sage' },
      { title: { fa: 'ایده‌های جسورانه', en: 'Wild ideas' }, parent: 0, depth: 1, row: -2, color: 'violet' },
      { title: { fa: 'ایده‌های قابل اجرا', en: 'Feasible ideas' }, parent: 0, depth: 1, row: -1, color: 'blue' },
      { title: { fa: 'محدودیت‌ها', en: 'Constraints' }, parent: 0, depth: 1, row: 0, color: 'amber' },
      { title: { fa: 'سؤال‌های باز', en: 'Open questions' }, parent: 0, depth: 1, row: 1, color: 'rose' },
      { title: { fa: 'آزمایش کوچک', en: 'Small experiment' }, parent: 0, depth: 1, row: 2, color: 'sage' },
    ],
  },
  research: {
    title: { fa: 'نقشهٔ تحقیق', en: 'Research map' },
    description: { fa: 'پرسش، منابع و شواهد مخالف را مرتب کن.', en: 'Organize sources, evidence and alternative explanations.' },
    items: [
      { title: { fa: 'موضوع تحقیق', en: 'Research topic' }, depth: 0, row: 0, color: 'sage' },
      { title: { fa: 'پرسش‌های اصلی', en: 'Research questions' }, parent: 0, depth: 1, row: -2, color: 'blue' },
      { title: { fa: 'فرضیه‌ها', en: 'Hypotheses' }, parent: 0, depth: 1, row: -1, color: 'violet' },
      { title: { fa: 'منابع و ارجاعات', en: 'Sources & references' }, parent: 0, depth: 1, row: 0, color: 'amber' },
      { title: { fa: 'شواهد و یافته‌ها', en: 'Evidence & findings' }, parent: 0, depth: 1, row: 1, color: 'sage' },
      { title: { fa: 'شواهد مخالف', en: 'Counterevidence' }, parent: 0, depth: 1, row: 2, color: 'rose' },
      { title: { fa: 'نتیجه و پرسش بعدی', en: 'Conclusion & next question' }, parent: 4, depth: 2, row: 1, color: 'blue' },
    ],
  },
  production: {
    title: { fa: 'تولید انیمیشن', en: 'Animation production' },
    description: { fa: 'از داستان تا تحویل؛ هر مرحله قابل‌ویرایش است.', en: 'Plan the pipeline from story through delivery.' },
    items: [
      { title: { fa: 'پروژهٔ انیمیشن', en: 'Animation project' }, depth: 0, row: 0, color: 'sage', kind: 'project' },
      { title: { fa: 'فیلمنامه', en: 'Screenplay' }, parent: 0, depth: 1, row: -3, color: 'violet' },
      { title: { fa: 'استوری‌بورد و انیماتیک', en: 'Storyboard & animatic' }, parent: 0, depth: 1, row: -2, color: 'blue' },
      { title: { fa: 'کانسپت و طراحی', en: 'Concept & design' }, parent: 0, depth: 1, row: -1, color: 'amber' },
      { title: { fa: 'مدل و ریگ', en: 'Model & rig' }, parent: 0, depth: 1, row: 0, color: 'sage' },
      { title: { fa: 'انیمیشن و لی‌اوت', en: 'Animation & layout' }, parent: 0, depth: 1, row: 1, color: 'blue' },
      { title: { fa: 'نور و کامپوزیت', en: 'Lighting & comp' }, parent: 0, depth: 1, row: 2, color: 'violet' },
      { title: { fa: 'صدا و تحویل', en: 'Sound & delivery' }, parent: 0, depth: 1, row: 3, color: 'rose' },
    ],
  },
  tasks: {
    title: { fa: 'برنامهٔ کارها', en: 'Task plan' },
    description: { fa: 'هدف را به تسک‌های قابل‌پیگیری تبدیل کن.', en: 'Break down an objective into actionable tasks.' },
    items: [
      { title: { fa: 'هدف و نتیجه', en: 'Objective & outcome' }, depth: 0, row: 0, color: 'sage', status: 'todo' },
      { title: { fa: 'تعریف خروجی', en: 'Define deliverable' }, parent: 0, depth: 1, row: -2, color: 'blue', status: 'todo' },
      { title: { fa: 'پیش‌نیازها', en: 'Dependencies' }, parent: 0, depth: 1, row: -1, color: 'amber', status: 'todo' },
      { title: { fa: 'گام اول', en: 'First action' }, parent: 0, depth: 1, row: 0, color: 'sage', status: 'doing' },
      { title: { fa: 'گام دوم', en: 'Second action' }, parent: 0, depth: 1, row: 1, color: 'blue', status: 'todo' },
      { title: { fa: 'بازبینی و تأیید', en: 'Review & approval' }, parent: 0, depth: 1, row: 2, color: 'violet', status: 'todo' },
    ],
  },
  decision: {
    title: { fa: 'نقشهٔ تصمیم', en: 'Decision map' },
    description: { fa: 'گزینه‌ها، معیارها و خطرها را کنار هم ببین.', en: 'Compare options, criteria, and risks.' },
    items: [
      { title: { fa: 'تصمیم پیش رو', en: 'Decision to make' }, depth: 0, row: 0, color: 'sage' },
      { title: { fa: 'گزینهٔ اول', en: 'Option A' }, parent: 0, depth: 1, row: -2, color: 'blue' },
      { title: { fa: 'گزینهٔ دوم', en: 'Option B' }, parent: 0, depth: 1, row: -1, color: 'violet' },
      { title: { fa: 'معیارها', en: 'Criteria' }, parent: 0, depth: 1, row: 0, color: 'amber' },
      { title: { fa: 'خطرها و فرض‌ها', en: 'Risks & assumptions' }, parent: 0, depth: 1, row: 1, color: 'rose' },
      { title: { fa: 'انتخاب و قدم بعدی', en: 'Decision & next step' }, parent: 0, depth: 1, row: 2, color: 'sage' },
    ],
  },
} as const satisfies Record<string, Definition>;

export type StarterTemplateId = keyof typeof STARTER_TEMPLATES;
export const STARTER_TEMPLATE_IDS = Object.keys(STARTER_TEMPLATES) as StarterTemplateId[];

export function insertStarterTemplate(document: Workspace, boardId: string, id: StarterTemplateId, language: Language):
  { document: Workspace; rootId: string | null; added: number } {
  const template: Definition | undefined = STARTER_TEMPLATES[id];
  if (!template || !document.boards.some(board => board.id === boardId)) return { document, rootId: null, added: 0 };
  // A project starter must have a real nested board, not merely a project-shaped icon.
  const hasNestedProject = template.items[0]?.kind === 'project';
  if (document.nodes.length + template.items.length > 5000 ||
      document.edges.length + template.items.length - 1 > 20000 ||
      (hasNestedProject && document.boards.length >= 2000))
    return { document, rootId: null, added: 0 };
  const existing = document.nodes.filter(node => node.boardId === boardId);
  const direction = language === 'fa' ? -1 : 1;
  const minX = existing.length ? Math.min(...existing.map(node => node.x)) : 0;
  const maxX = existing.length ? Math.max(...existing.map(node => node.x + node.width)) : 0;
  const minY = existing.length ? Math.min(...existing.map(node => node.y)) : 0;
  const maxY = existing.length ? Math.max(...existing.map(node => node.y + node.height)) : 0;
  const rootX = existing.length ? (direction < 0 ? minX - 424 : maxX + 180) : 0;
  const rootY = existing.length ? (minY + maxY) / 2 : 0;
  const nodes: GraphNode[] = template.items.map(item => makeNode(boardId, item.kind ?? 'note',
    rootX + direction * item.depth * 350, rootY + item.row * 228, {
      title: item.title[language], text: item.note?.[language] ?? '', color: item.color,
    }));
  // The pipeline stays visible on the current canvas; its root also owns an
  // initially empty inner project for notes, references and further layers.
  // Both sides of the containment relation are committed in the same Undo step.
  const innerBoard: Board | null = hasNestedProject ? {
    id: uid(), title: nodes[0].title, description: template.description[language],
    parentNodeId: nodes[0].id, createdAt: nodes[0].createdAt,
  } : null;
  if (innerBoard) nodes[0].childBoardId = innerBoard.id;
  for (let i = 0; i < template.items.length; i++) {
    const item = template.items[i];
    if (item.status) nodes[i].task = { status: item.status, parentId: item.parent === undefined ? null : nodes[item.parent].id };
  }
  const edges: GraphEdge[] = template.items.flatMap((item, index) =>
    item.parent === undefined ? [] : [{ id: uid(), boardId, sourceId: nodes[item.parent].id, targetId: nodes[index].id, label: '' }]);
  return { document: { ...document,
      boards: innerBoard ? [...document.boards, innerBoard] : document.boards,
      nodes: [...document.nodes, ...nodes], edges: [...document.edges, ...edges] },
    rootId: nodes[0].id, added: nodes.length };
}
