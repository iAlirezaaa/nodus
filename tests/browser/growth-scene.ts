/** Deterministic synthetic scene for connected growth, energy and task appearance QA. */
import type { GraphEdge, GraphNode, NodeColor, Workspace } from '../../lib/types';

export const GROWTH_FIXTURE_USER = 'fixture-growth-ui';
export const GROWTH_STORAGE_KEY = 'nodus:ui-fixture:growth:server:v1';
export const GROWTH_HOME = 'growth-home';
const createdAt = '2026-11-12T12:00:00.000Z';

/** Coordinates name the center so node and card views share the same composition. */
function node(id: string, title: string, centerX: number, centerY: number, patch: Partial<GraphNode> = {}): GraphNode {
  const width = patch.width ?? 244, height = patch.height ?? 172;
  return { id, boardId: GROWTH_HOME, kind: 'note', title, text: '', x: centerX - width / 2, y: centerY - height / 2,
    width, height, color: 'sage', asset: null, url: '', childBoardId: null, createdAt, ...patch };
}
function edge(sourceId: string, targetId: string, color: NodeColor): GraphEdge {
  return { id: `${sourceId}-to-${targetId}`, boardId: GROWTH_HOME, sourceId, targetId, label: '', color, route: 'curve' };
}

export function createGrowthWorkspace(): Workspace {
  const isolated = node('growth-isolated', 'بذر تازه', -750, -340, {
    color: 'amber', text: 'یک فکر مستقل، بدون هیچ پیوند.\n\nحرکت آرام این بذر را با دو فکر متصل مقایسه کن. با Tab اولین شاخه را بساز؛ اندازه و نورش باید با همین پیوند بیشتر شود.',
  });
  const five = node('growth-five', 'طراحی محصول', -430, 120, {
    color: 'blue', task: { status: 'doing', parentId: null },
    text: 'پنج فکر به این کار وصل‌اند.\n\nمسئله، مسیر کاربر و طرح اولیه را کنار نوشتن متن و بازبینی پیش می‌بریم. یک زیرکار تمام شده و یکی هنوز مانده است.\n\nپیوند زیرکارها هم در شمارش اتصال‌ها حساب می‌شود؛ رابطهٔ تکراری اندازه را دوباره زیاد نمی‌کند.',
  });
  const twelve = node('growth-twelve', 'فکر مشترک', 455, 0, {
    color: 'violet', text: 'دوازده پیوند، از شنیدن تا تصمیم گرفتن.\n\nده فکر به این نقطه وارد می‌شوند و دو مسیر از آن بیرون می‌روند. پیوندهای ورودی هم اندازه، نور و ضربان این فکر را بیشتر می‌کنند.\n\nرنگش را تغییر بده، یک پیوند را حذف کن و سپس Undo بزن تا بازگشت ظاهر و حرکت را ببینی.',
  });

  const fiveNeighbors: GraphNode[] = [
    node('growth-problem', 'مسئله', -720, -50, { color: 'blue', width: 184, height: 118, text: 'ایده را سریع ثبت کنیم، بی‌آنکه جریان فکر قطع شود.' }),
    node('growth-flow', 'مسیر کاربر', -720, 245, { color: 'sage', width: 184, height: 118, text: 'یک فکر، یک شاخه، یک قدم روشن برای ادامه.' }),
    node('growth-draft', 'طرح اولیه', -430, 430, { color: 'rose', width: 184, height: 118, text: 'نور و اندازه باید ارتباط‌ها را خواناتر کنند.' }),
    node('growth-task-todo', 'نوشتن متن', -145, 245, { color: 'amber', width: 184, height: 118,
      task: { status: 'todo', parentId: five.id }, text: 'عنوان‌ها و راهنمای کوتاه مسیر اصلی را بنویسیم. این زیرکار هنوز انجام نشده است.' }),
    node('growth-task-done', 'بازبینی', -145, -50, { color: 'sage', width: 184, height: 118,
      task: { status: 'done', parentId: five.id }, text: 'مسیر ثبت ایده و ساخت زیرشاخه بازبینی شد. این زیرکار انجام شده است.' }),
  ];

  const inputs: { id: string; title: string; color: NodeColor; text: string }[] = [
    { id: 'question', title: 'پرسش', color: 'blue', text: 'چه چیزی فکر کردن را آسان‌تر می‌کند؟' },
    { id: 'experience', title: 'تجربه', color: 'sage', text: 'از تجربهٔ روزانه شروع کنیم.' },
    { id: 'feedback', title: 'بازخورد', color: 'rose', text: 'مکث‌های کاربر را ببینیم و بشنویم.' },
    { id: 'research', title: 'پژوهش', color: 'blue', text: 'فرض‌ها را با مشاهده بررسی کنیم.' },
    { id: 'inspiration', title: 'الهام', color: 'amber', text: 'از دفتر یادداشت و شبکهٔ نورون‌ها الهام بگیریم.' },
    { id: 'observation', title: 'مشاهده', color: 'sage', text: 'هر جزئیات کوچک می‌تواند یک فکر تازه بسازد.' },
    { id: 'need', title: 'نیاز', color: 'rose', text: 'فکر تازه باید پیش از فراموش شدن ثبت شود.' },
    { id: 'experiment', title: 'آزمایش', color: 'blue', text: 'یک تغییر کوچک را در استفادهٔ واقعی بسنجیم.' },
    { id: 'possibility', title: 'امکان', color: 'amber', text: 'کدام مسیر هنوز امتحان نشده است؟' },
    { id: 'comparison', title: 'مقایسه', color: 'gray', text: 'راه‌های مختلف را کنار هم ببینیم.' },
    { id: 'decision', title: 'تصمیم', color: 'violet', text: 'نتیجهٔ فکرهای متصل: یک مسیر روشن برای ادامه.' },
    { id: 'next', title: 'گام بعد', color: 'sage', text: 'تصمیم را به یک قدم کوچک و قابل انجام تبدیل کنیم.' },
  ];
  const twelveNeighbors = inputs.map((input, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 6;
    return node(`growth-${input.id}`, input.title, 455 + Math.round(Math.cos(angle) * 390), Math.round(Math.sin(angle) * 370), {
      color: input.color, text: input.text, width: 160, height: 112,
    });
  });

  return {
    version: 1, homeBoardId: GROWTH_HOME,
    boards: [{ id: GROWTH_HOME, title: 'فکرها جان می‌گیرند', description: 'سه فکر با صفر، پنج و دوازده پیوند؛ رنگ، حرکت و پیشرفت در یک نگاه.', parentNodeId: null, createdAt }],
    nodes: [isolated, five, twelve, ...fiveNeighbors, ...twelveNeighbors],
    edges: [
      ...fiveNeighbors.map(child => edge(five.id, child.id, child.color)),
      ...twelveNeighbors.map((neighbor, index) => index < 10
        ? edge(neighbor.id, twelve.id, neighbor.color)
        : edge(twelve.id, neighbor.id, neighbor.color)),
    ],
  };
}
