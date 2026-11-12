import { ChevronDown, Keyboard, MousePointer2 } from 'lucide-react';
import type { Language } from '@/lib/types';

type ShortcutRow = { keys: string; label: string };

function ShortcutRows({ rows }: { rows: ShortcutRow[] }) {
  return <dl className="shortcut-guide-rows">{rows.map(row => <div key={row.keys}>
    <dt><kbd dir="ltr">{row.keys}</kbd></dt><dd>{row.label}</dd>
  </div>)}</dl>;
}

export default function ShortcutGuide({ language }: { language: Language }) {
  const L = (fa: string, en: string) => language === 'fa' ? fa : en;
  const scopes = [
    {
      id: 'canvas', number: '01', title: L('روی بوم و فکر', 'On the canvas or a thought'),
      description: L('روی فضای خالی بوم کلیک کن. با کلیدهای جهت، یک فکر را برای ادامه انتخاب کن.', 'Click an empty area of the canvas. Use the arrow keys to select a thought to continue.'),
      rows: [
        { keys: 'Enter', label: L('فکر تازه؛ اگر فکری انتخاب شده، هم‌سطحِ آن', 'A new thought; a sibling when a thought is selected') },
        { keys: 'Tab', label: L('زیرشاخهٔ فکر انتخاب‌شده', 'A child of the selected thought') },
        { keys: 'F2', label: L('ویرایش عنوان فکر انتخاب‌شده', 'Edit the selected thought’s title') },
      ],
      note: L('Delete فکرها یا اتصالِ انتخاب‌شده را حذف می‌کند. Esc انتخاب را برمی‌دارد. برای انتخاب چندتایی، Shift را نگه دار و روی فکرها کلیک کن یا روی فضای خالی کادر بکش.', 'Delete removes the selected thoughts or connection. Esc clears selection. Hold Shift and click thoughts or drag a box on empty canvas to select a group.'),
    },
    {
      id: 'title', number: '02', title: L('هنگام نوشتن عنوان روی بوم', 'While writing a title on the canvas'),
      description: L('این ورودی برای ادامه‌دادن سریع فکرهاست؛ لازم نیست هر بار به سراغ ماوس بروی.', 'This input keeps ideas flowing without reaching for the mouse.'),
      rows: [
        { keys: 'Enter', label: L('ثبت عنوان و نوشتن فکر هم‌سطح بعدی', 'Save the title and write the next sibling') },
        { keys: 'Tab', label: L('ثبت عنوان و نوشتن یک زیرشاخه', 'Save the title and write a child') },
        { keys: 'Esc', label: L('ثبت و پایان نوشتن؛ فکرِ تازهٔ خالی کنار گذاشته می‌شود', 'Save and finish writing; discard an empty new title') },
      ],
    },
    {
      id: 'text', number: '03', title: L('داخل متن و پنجره‌ها', 'Inside text and dialogs'),
      description: L('میانبرهای ساخت فکر در اینجا غیرفعال‌اند. متن و دکمه‌ها رفتار معمول خود را دارند.', 'Thought-creation shortcuts are inactive here. Text and buttons keep their usual behavior.'),
      rows: [
        { keys: 'Enter', label: L('سطر تازه در متن؛ اجرای دکمهٔ دارای تمرکز', 'A new line in text; activate a focused button') },
        { keys: 'Tab', label: L('رفتن به ورودی یا دکمهٔ بعدی', 'Move to the next field or button') },
        { keys: 'Delete', label: L('حذف متن هنگام تایپ؛ خودِ فکر حذف نمی‌شود', 'Delete text while typing; the thought stays intact') },
      ],
    },
  ];
  const advanced: ShortcutRow[] = [
    { keys: '← ↑ ↓ →', label: L('حرکت بین فکرها', 'Move between thoughts') },
    { keys: 'Shift + Tab', label: L('برگشت به فکر والد، اگر وجود دارد', 'Return to the parent thought, when there is one') },
    { keys: 'Shift + Enter', label: L('باز کردن متن و جزئیات فکر', 'Open the thought’s text and details') },
    { keys: 'Ctrl / ⌘ + Enter', label: L('ورود به پروژهٔ داخلیِ فکر انتخاب‌شده، خارج از تایپ', 'Enter the selected thought’s inner project, when not typing') },
    { keys: 'N / T', label: L('فکر مستقل تازه / تسک تازه', 'New independent thought / new task') },
    { keys: 'F', label: L('نمایش تمام بوم', 'Fit the whole canvas') },
    { keys: 'H / V', label: L('ابزار جابه‌جایی بوم / انتخاب فکر', 'Pan tool / selection tool') },
    { keys: 'Space', label: L('روی بوم: جابه‌جایی موقت؛ روی فکر: باز کردن جزئیات', 'On the canvas: temporary pan; on a thought: open details') },
    { keys: 'Shift + F10', label: L('منوی عملیات فکر یا اتصال', 'Open the thought or connection’s context menu') },
    { keys: 'Ctrl / ⌘ + K', label: L('جست‌وجو، وقتی تمرکز روی بوم یا فکر است', 'Search, while the canvas or a thought has focus') },
    { keys: 'Ctrl / ⌘ + A', label: L('انتخاب همهٔ فکرهای همین بوم؛ هنگام تایپ، انتخاب متن حفظ می‌شود', 'Select every thought on this board; text fields keep normal Select all') },
    { keys: 'Ctrl / ⌘ + Z', label: L('بازگردانی تغییر بوم، وقتی تمرکز روی بوم یا فکر است', 'Undo a graph change, while the canvas or a thought has focus') },
    { keys: 'Ctrl / ⌘ + Shift + Z', label: L('انجام دوبارهٔ تغییر بوم', 'Redo a graph change') },
  ];

  return <div className="shortcut-guide" dir={language === 'fa' ? 'rtl' : 'ltr'}>
    <p className="shortcut-guide-intro">{L('هر کلید، در جای خودش. ابتدا ببین تمرکز روی بوم است یا داخل یک نوشته.', 'Each key follows your focus. Start with where you are: the canvas or a text field.')}</p>
    <div className="shortcut-guide-mouse"><MousePointer2 size={17} aria-hidden="true" /><p>{L('مکث روی فکر: پیش‌نمایش · کلیک: باز کردن محتوا · کلیک راست: عملیات بیشتر', 'Hover a thought to preview · Click to open its content · Right-click for more actions')}</p></div>
    <div className="shortcut-guide-scopes">{scopes.map(scope => <section key={scope.id} className={`shortcut-guide-scope scope-${scope.id}`} aria-labelledby={`shortcut-scope-${scope.id}`}>
      <header><span className="shortcut-guide-number" aria-hidden="true">{scope.number}</span><div><h3 id={`shortcut-scope-${scope.id}`}>{scope.title}</h3><p>{scope.description}</p></div></header>
      <ShortcutRows rows={scope.rows} />
      {scope.note && <p className="shortcut-guide-note">{scope.note}</p>}
    </section>)}</div>
    <details className="shortcut-guide-advanced">
      <summary><Keyboard size={17} aria-hidden="true" /><span>{L('میانبرهای بیشتر', 'More shortcuts')}</span><ChevronDown size={16} className="shortcut-guide-chevron" aria-hidden="true" /></summary>
      <div className="shortcut-guide-advanced-content"><p>{L('این فرمان‌ها روی بوم و فکرِ دارای تمرکز کار می‌کنند. هنگام تایپ یا کار با دکمه‌ها، میانبرهای همان کنترل حفظ می‌شوند.', 'These commands work when the canvas or a thought has focus. While typing or using controls, their own keyboard behavior is preserved.')}</p><ShortcutRows rows={advanced} /></div>
    </details>
  </div>;
}
