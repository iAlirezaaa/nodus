/** Deterministic synthetic data for living-node interaction QA. No file URLs. */
import type { GraphEdge, GraphNode, NodeColor, NodeKind, Workspace } from '../../lib/types';

export const LIVING_FIXTURE_USER = 'fixture-living-nodes';
export const LIVING_STORAGE_KEY = 'nodus:ui-fixture:living:server:v1';
export const LIVING_HOME = 'living-growth';
const CONTENT = 'living-content';
const NESTED = 'living-project-board';
const createdAt = '2026-11-12T12:00:00.000Z';

function node(id: string, boardId: string, title: string, x: number, y: number, patch: Partial<GraphNode> = {}): GraphNode {
  return { id, boardId, kind: 'note', title, text: '', x, y, width: 244, height: 172,
    color: 'sage', asset: null, url: '', childBoardId: null, createdAt, ...patch };
}
function edge(id: string, boardId: string, sourceId: string, targetId: string, color: NodeColor = 'sage'): GraphEdge {
  return { id, boardId, sourceId, targetId, label: '', color, route: 'curve' };
}

const longText = [
  'این یک یادداشت واقعی در فضای آزمایشی است. همهٔ نوشته‌ها و تغییرات این صفحه فقط به حساب مصنوعی آزمون تعلق دارند.',
  'انتخاب متن: این عبارت را انتخاب کن و یک نظر به آن اضافه کن. نظر ذخیره‌شده را ویرایش کن، ببند و دوباره باز کن تا بازگشت تمرکز و ماندگاری پیش‌نویس را بررسی کنی.',
  'بخش اول — خواندن بدون باز کردن\nنشانگر را روی گره نگه دار. پیش‌نمایش باید خوانا باشد و رشد بصری به تعداد شاخه‌های واقعی وابسته بماند. خروج نشانگر نباید هیچ داده‌ای را تغییر دهد.',
  'بخش دوم — پنجرهٔ محتوا\nبا کلیک روی گره، محتوا را باز کن. این متن چندخطی باید قابل پیمایش و ویرایش باشد. Enter در یادداشت یک خط تازه می‌سازد؛ Tab میان کنترل‌های پنجره حرکت می‌کند.',
  'بخش سوم — نوشتن سریع روی بوم\nبعد از بستن پنجره، F2 عنوان را روی خود گره ویرایش می‌کند. Enter فکر هم‌سطح می‌سازد و Tab یک زیرشاخه. عنوان خالی نباید به فضای ذخیره‌شده وارد شود.',
  'بخش چهارم — پیش‌نویس نظر\nیک نظر بنویس و پیش از ذخیره پنجره را ببند. هنگام بازکردن دوبارهٔ همین گره، پیش‌نویس ذخیره‌نشده باید همچنان در دسترس باشد. ثبت نظر فقط با دکمهٔ ذخیره انجام می‌شود.',
  'بخش پنجم — تمرکز و ورودی‌های بومی\nEscape پنجره را می‌بندد و تمرکز باید به گره برگردد. در حالت ترکیب حروف، کلیدهای تایپ نباید پنجره را ببندند. این داده فقط برای آزمون است و تأیید رفتار IME نیازمند ورودی واقعی است.',
  'بخش ششم — حرکت و دسترس‌پذیری\nحرکت گره‌ها باید هنگام بی‌کاری هم دیده شود و در زمان خواندن یا ویرایش مزاحم نباشد. تنظیم کاهش حرکت سیستم باید محترم بماند.',
  'آخر یادداشت — این خط برای بررسی پیمایش کامل متن در پنجرهٔ موبایل است.\nEnd of the synthetic long note: no real workspace, account, or attachment is used.',
].join('\n\n');

export function createLivingWorkspace(): Workspace {
  const leaf = node('living-leaf', LIVING_HOME, '۰ شاخه · بذر مستقل', -900, -200, {
    color: 'amber', text: 'Leaf · 0 outgoing branches.\nاین گره هیچ زیرشاخه‌ای ندارد. حرکت پایه، بزرگ‌شدن روی هاور و بازشدن محتوای آن را بررسی کن.\nبا F2 می‌توانی عنوان را ویرایش کنی؛ با Tab اولین زیرشاخه را بساز.',
  });
  const five = node('living-five', LIVING_HOME, '۵ شاخه · فکر در حال رشد', -420, -200, {
    color: 'blue', text: 'Five branches · 5 connected child nodes.\nپنج شاخهٔ واقعی به این فکر وصل‌اند. اندازه و حرکت این گره را با بذر مستقل و شبکهٔ بیست‌شاخه مقایسه کن.\nاین ارتباط‌ها جزئی از دادهٔ واقعی همین آزمون هستند.',
  });
  const twenty = node('living-twenty', LIVING_HOME, '۲۰ شاخه · شبکهٔ بزرگ', 584, -200, {
    color: 'violet', text: 'Twenty branches · 20 connected child nodes.\nاین گره بیست زیرشاخهٔ مستقل دارد. از پنجرهٔ محتوا یک زیرشاخه اضافه کن و تغییر اندازه را بررسی کن.\nپس از بارگذاری دوباره، شاخه‌ها و محتوای نوشته‌شده باید باقی بمانند.',
  });
  const fivePositions = [[-700, 100], [-420, 100], [-140, 100], [-560, 360], [-280, 360]];
  const fiveChildren = fivePositions.map(([x, y], index) => node(`living-five-child-${index + 1}`, LIVING_HOME, `شاخهٔ پنج‌تایی ${index + 1}`, x, y, {
    color: 'blue', width: 172, height: 110, text: `زیرشاخهٔ ${index + 1} از ۵.\nاین گره را می‌توان باز کرد، ویرایش کرد و با Tab ادامه داد.`,
  }));
  const twentyChildren = Array.from({ length: 20 }, (_, index) => node(`living-twenty-child-${index + 1}`, LIVING_HOME, `شاخهٔ بیست‌تایی ${index + 1}`, 190 + index % 5 * 215, 100 + Math.floor(index / 5) * 160, {
    color: (['violet', 'rose', 'sage', 'blue'] as NodeColor[])[index % 4], width: 172, height: 110,
    text: `زیرشاخهٔ ${index + 1} از ۲۰.\nOrdinary connected thought ${index + 1}; this is editable synthetic content.`,
  }));
  const longNote = node('living-long-note', CONTENT, 'متن بلند · یادداشت و نظر', -390, -260, { color: 'amber', text: longText });
  const quote = 'انتخاب متن';
  longNote.annotations = [{ id: 'living-existing-annotation', field: 'text', start: longText.indexOf(quote), end: longText.indexOf(quote) + quote.length,
    quote, body: 'نظر ذخیره‌شدهٔ آزمون: می‌توانی آن را ویرایش، حل یا دوباره باز کنی.', color: 'amber', resolved: false, createdAt, updatedAt: createdAt }];
  const task = node('living-task', CONTENT, 'تسک نمونه · سه زیرکار', 0, -20, { color: 'sage', task: { status: 'doing', parentId: null }, scheduledAt: '2026-11-16',
    text: 'یک تسک واقعی با سه زیرکار و سه وضعیت متفاوت.\nدر پنجرهٔ محتوا وضعیت را تغییر بده، یک ساب‌تسک اضافه کن و سپس به بوم برگرد.\nپیشرفت اولیه: یک زیرکار انجام‌شده از سه زیرکار.',
  });
  const subtasks = (['todo', 'doing', 'done'] as const).map((status, index) => node(`living-subtask-${index + 1}`, CONTENT,
    ['زیرکار اول · انجام‌نشده', 'زیرکار دوم · در حال انجام', 'زیرکار سوم · انجام‌شده'][index], 390, -260 + index * 240, {
      color: (['amber', 'blue', 'sage'] as NodeColor[])[index], task: { status, parentId: task.id },
      text: `این زیرکار به «${task.title}» تعلق دارد. وضعیت و متن آن را می‌توان مستقل ویرایش کرد.`,
    }));
  const project = node('living-project', CONTENT, 'یک پروژه در یک گره', -390, 220, { kind: 'project' as NodeKind, color: 'violet', childBoardId: NESTED,
    text: 'این پروژه واقعاً یک بوم داخلی با سه فکر متصل دارد.\nکلیک اول باید پنجرهٔ محتوا را باز کند؛ کنترل «ورود به بوم داخلی» یا Ctrl / ⌘ + Enter مسیر ورود به پروژه است.\nپس از ورود، از مسیر بالای صفحه برگرد.',
  });
  const nested = [
    node('living-inner-root', NESTED, 'داخل پروژه · شروع', -200, 0, { color: 'violet', text: 'این بوم از پروژهٔ والد باز شده است. محتوا و ارتباط‌های آن مستقل‌اند.' }),
    node('living-inner-note', NESTED, 'یادداشت داخلی', 180, -150, { color: 'blue', text: 'محتوای واقعی یک گره در لایهٔ داخلی.\nآن را ویرایش کن و با مسیر بالا به بوم مادر برگرد.' }),
    node('living-inner-task', NESTED, 'تسک داخلی', 180, 150, { color: 'sage', task: { status: 'todo', parentId: null }, text: 'یک تسک درون پروژه، برای بررسی پنجرهٔ محتوا در لایهٔ دوم.' }),
  ];
  return { version: 1, homeBoardId: LIVING_HOME,
    boards: [
      { id: LIVING_HOME, title: 'رشد زنده · ۰ / ۵ / ۲۰ شاخه', description: 'Synthetic living-node QA: direct branch counts 0, 5, and 20.', parentNodeId: null, createdAt },
      { id: CONTENT, title: 'متن، تسک و پروژه', description: 'Synthetic content-popup QA: long note, annotations, tasks, and nested canvas.', parentNodeId: null, createdAt },
      { id: NESTED, title: project.title, description: project.text, parentNodeId: project.id, createdAt },
    ],
    nodes: [leaf, five, twenty, ...fiveChildren, ...twentyChildren, longNote, task, ...subtasks, project, ...nested],
    edges: [
      ...fiveChildren.map((child, index) => edge(`living-five-edge-${index + 1}`, LIVING_HOME, five.id, child.id, 'blue')),
      ...twentyChildren.map((child, index) => edge(`living-twenty-edge-${index + 1}`, LIVING_HOME, twenty.id, child.id, 'violet')),
      ...subtasks.map((child, index) => edge(`living-task-edge-${index + 1}`, CONTENT, task.id, child.id)),
      edge('living-inner-edge-1', NESTED, nested[0].id, nested[1].id, 'violet'),
      edge('living-inner-edge-2', NESTED, nested[0].id, nested[2].id, 'violet'),
    ],
  };
}
