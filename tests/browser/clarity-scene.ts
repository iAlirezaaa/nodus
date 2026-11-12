/** Editable synthetic sample for screenshots and focus/shortcut QA. No real data. */
import type { GraphEdge, GraphNode, NodeColor, Workspace } from '../../lib/types';

export const CLARITY_FIXTURE_USER = 'fixture-clarity-ui';
export const CLARITY_STORAGE_KEY = 'nodus:ui-fixture:clarity:server:v1';
export const CLARITY_HOME = 'clarity-home';
const NESTED = 'clarity-design-board';
const createdAt = '2026-11-12T12:00:00.000Z';

function node(id: string, title: string, x: number, y: number, patch: Partial<GraphNode> = {}): GraphNode {
  return { id, boardId: CLARITY_HOME, kind: 'note', title, text: '', x, y, width: 244, height: 172,
    color: 'sage', asset: null, url: '', childBoardId: null, createdAt, ...patch };
}
function edge(sourceId: string, targetId: string, color: NodeColor = 'sage', boardId = CLARITY_HOME): GraphEdge {
  return { id: `${sourceId}-to-${targetId}`, boardId, sourceId, targetId, label: '', color, route: 'curve' };
}

export function createClarityWorkspace(): Workspace {
  const researchText = 'قبل از ساختن، مسئله را بهتر بفهمیم.\n\nچه چیزی جریان فکر کردن را قطع می‌کند؟\nچه کاری باید با یک حرکت انجام شود؟\n\nبا سه نفر گفت‌وگو کنیم و نکته‌های مشترک را کنار هم بگذاریم.';
  const quote = 'جریان فکر کردن';
  return {
    version: 1,
    homeBoardId: CLARITY_HOME,
    boards: [
      { id: CLARITY_HOME, title: 'یک ایده، چند مسیر', description: 'Synthetic sample workspace for a readable app preview and keyboard QA.', parentNodeId: null, createdAt },
      { id: NESTED, title: 'طراحی', description: 'از مسیر کاربر تا جزئیات صفحه.', parentNodeId: 'clarity-design', createdAt },
    ],
    nodes: [
      node('clarity-root', 'پروژهٔ بعدی من', 0, 0, { text: 'فضایی برای فکر کردن، پیوند دادن ایده‌ها و تبدیلشان به کارهای کوچک.\n\nاز همین فکر شروع می‌کنیم؛ هر مسیر می‌تواند به یک پروژهٔ مستقل تبدیل شود.' }),
      node('clarity-research', 'تحقیق', -320, -160, { color: 'blue', text: researchText,
        annotations: [{ id: 'clarity-research-note', field: 'text', start: researchText.indexOf(quote), end: researchText.indexOf(quote) + quote.length,
          quote, body: 'در مصاحبه‌ها به مکث‌ها و تغییر ابزار توجه کنیم.', color: 'blue', resolved: false, createdAt, updatedAt: createdAt }],
      }),
      node('clarity-design', 'طراحی', 320, -160, { color: 'violet', kind: 'project', childBoardId: NESTED, text: 'یک مسیر کوتاه و واضح: ایده را بنویس، شاخه بساز، جزئیات را وقتی لازم شد باز کن.\n\nداخل این پروژه، طرح اولیه و جزئیات تجربه را کنار هم نگه می‌داریم.' }),
      node('clarity-build', 'ساختن', 0, 245, { color: 'amber', task: { status: 'doing', parentId: null }, text: 'اول مسیر اصلی را کامل کنیم. بعد با استفادهٔ واقعی، بخش‌های مزاحم را پیدا و ساده کنیم.' }),
      node('clarity-question', 'کاربر چه می‌خواهد؟', -610, -280, { color: 'blue', text: 'ثبت سریع ایده، دیدن ارتباط‌ها، و برگشتن به جریان کار بدون گم شدن در ابزارها.' }),
      node('clarity-inspiration', 'نمونه‌های الهام‌بخش', -600, 65, { color: 'blue', text: 'نقشهٔ ذهنی روی کاغذ، دفتر یادداشت و شبکهٔ نورون‌ها.\n\nسادگی هر کدام را نگه داریم؛ حرکت‌ها باید به فهم رابطه کمک کنند.' }),
      node('clarity-flow', 'اولین مسیر کاربر', 610, -270, { color: 'violet', text: '۱. یک فکر تازه\n۲. یک زیرشاخه\n۳. متن کامل، فقط وقتی لازم شد\n\nهر مرحله باید جای مشخص و بازخورد قابل فهم داشته باشد.' }),
      node('clarity-release', 'نسخهٔ اول', 420, 260, { color: 'amber', task: { status: 'todo', parentId: 'clarity-build' }, text: 'مسیر نوشتن و شاخه‌سازی را با کیبورد و لمس بررسی کنیم؛ سپس نسخهٔ آماده را منتشر کنیم.' }),
      node('clarity-inner-start', 'طرح اولیه', -200, 0, { boardId: NESTED, color: 'violet', text: 'مرکز صفحه برای فکرهاست. ابزارها فقط وقتی لازم‌اند خودشان را نشان می‌دهند.' }),
      node('clarity-inner-detail', 'جزئیات تجربه', 200, 0, { boardId: NESTED, color: 'sage', text: 'راهنمای کوتاه برای همان کاری که الان انجام می‌دهیم. عنوان‌ها خوانا، بازگشت‌ها واضح و حرکت‌ها آرام.' }),
    ],
    edges: [
      edge('clarity-root', 'clarity-research', 'blue'),
      edge('clarity-root', 'clarity-design', 'violet'),
      edge('clarity-root', 'clarity-build', 'amber'),
      edge('clarity-research', 'clarity-question', 'blue'),
      edge('clarity-research', 'clarity-inspiration', 'blue'),
      edge('clarity-design', 'clarity-flow', 'violet'),
      edge('clarity-build', 'clarity-release', 'amber'),
      edge('clarity-inner-start', 'clarity-inner-detail', 'violet', NESTED),
    ],
  };
}
