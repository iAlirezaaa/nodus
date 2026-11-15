# رودمپ Nodus

آخرین به‌روزرسانی: ۲۰۲۶-۱۱-۱۵ · مالک: Hades · مخزن: [iAlirezaaa/nodus](https://github.com/iAlirezaaa/nodus)

## هدف محصول

Nodus باید فضای واقعی و ماندگاری برای فکرکردن با نودهای متصل باشد: شروع سریع، ادامهٔ فکر با کیبورد، خواندن واضح، پروژه‌های تو‌در‌تو، کار گروهی و امکان شخصی‌سازی. امکانات بیشتر باید در جای مناسب و هنگام نیاز ظاهر شوند؛ تعداد دکمه‌های همیشه‌نمایان معیار پیشرفت نیست.

پنج محور توسعه عبارت‌اند از **کاربری آسان‌تر، امکانات کاربردی، دیزاین خواناتر، شخصی‌سازی و انیمیشن بهتر**. حفظ داده، سرعت و دسترس‌پذیری شرط مشترک همهٔ محورهاست.

این فایل برنامهٔ زندهٔ پروژه است. پس از تکمیل و فعال‌شدن هر قابلیت، وضعیت، شواهد بررسی، نسخهٔ انتشار و کار بعدی همین‌جا و در [گزارش توسعه](DEVELOPMENT_LOG.md) ثبت می‌شوند. روش اجرای هر نوبت در [چرخهٔ توسعه](DEVELOPMENT_LOOP.md) آمده است.

## مبنای فعلی؛ قابلیت‌های موجود

این موارد از قبل ساخته شده‌اند و نباید دوباره به‌عنوان قابلیت جدید گزارش شوند:

| بخش | وضعیت موجود |
| --- | --- |
| بوم و محتوا | نودهای متصل، یادداشت، فایل و پیش‌نمایش رسانه، پروژه‌های تو‌در‌تو، ذخیرهٔ پایدار و جست‌وجوی پایه |
| جریان فکر | Enter برای ادامه، Tab برای زیرشاخه، ویرایش عنوان درجا، پیش‌نمایش با مکث، پنجرهٔ محتوا با کلیک و میان‌برهای وابسته به محل تمرکز |
| کارها و یادداشت‌ها | تسک و ساب‌تسک، وضعیت انجام، نظر روی متن و ویرایش ارتباط‌ها و مسیرشان |
| دیزاین | نمایش نورونی و کارتی، شش چیدمان، تنظیم پس‌زمینه/تراکم/رنگ، رشد محدود اندازه بر اساس اتصال‌ها و محتوای داخلی |
| حرکت | نور روی ارتباط‌ها، حرکت زندهٔ نودها، فیزیک مگنتی، پین، توقف هنگام تعامل، رعایت reduced motion و صفحهٔ پنهان |
| ویرایش گروهی | انتخاب چندتایی، کادر انتخاب، جابه‌جایی گروه، تغییر رنگ/وضعیت و حذف با یک Undo |
| فضاها | چند فضای شخصی، حذف فضای دارای پروژهٔ داخلی و بازگردانی در تاریخچهٔ همان نشست |
| همکاری | اتاق مشترک، حضور و نشانگر همکاران، ذخیرهٔ محافظت‌شده در برابر تعارض و بازیابی پیش‌نویس |

مبنای کد: [کامیت GitHub](https://github.com/iAlirezaaa/nodus/commit/f0958145973a130a0041604cb08f36925fe19e26)، درخت فایل `4a00c185218e8a627dfccf9c60ae32cc1b10b54b`، انتشار Site شمارهٔ ۱۱. تاریخچهٔ GitHub و Sites شناسهٔ کامیت یکسان ندارند؛ در این مبنا درخت فایل‌ها یکسان است.

بررسی ثبت‌شدهٔ این مبنا: **۲۰۵ تست خودکار، TypeScript و build موفق**، همراه با [بررسی انتخاب و حذف فضا](SELECTION-SPACES-QA.md) و [بررسی رشد و مگنت](CONNECTED-GROWTH-QA.md). بررسی مرورگر از رابط واقعی با دادهٔ آزمایشی جدا استفاده کرده است؛ این شواهد به معنی آزمون دو حساب واقعیِ واردشده یا دستگاه لمسی واقعی نیست.

## وضعیت‌ها و اولویت

| وضعیت | معنی |
| --- | --- |
| Queued | نیاز ثبت شده؛ وابستگی یا جزئیات هنوز باید آماده شود. |
| Ready | معیار پذیرش مشخص است و می‌توان کار را شروع کرد. |
| In progress | اجرای مشخص روی برنچ/برش مشخص در حال کار است. |
| Verified | پیاده‌سازی و بررسی مرتبط کامل شده؛ هنوز فعال‌شدن در نسخهٔ اصلی تأیید نشده است. |
| Released | در main ثبت شده، نسخهٔ متناظر منتشر شده و محل دسترسی کاربر ثبت شده است. |
| Blocked | مانع واقعی با علت، شواهد و اقدام بعدی ثبت شده است. |

هر ایراد واقعیِ از‌دست‌رفتن داده، تداخل میان‌بر، خطای ذخیره یا انتشار نیمه‌تمام بر صف امکانات جدید مقدم است. در حالت عادی، کارِ باز و نیمه‌تمام ادامه پیدا می‌کند؛ اگر کاری باز نیست، اولین Ready انتخاب می‌شود.

**صف آغازین:** ND-001 ← ND-002 ← ND-003.

**آخرین گیت ND-001 (۱۵ نوامبر ۲۰۲۶):** برنچ `fix/nd-001-search-clarity` هنوز `In progress` و انتشار `Blocked` است. فرمان `npm run verify:release` به‌صورت قابل‌تکرار و مستقل از shell با Node 24 به workflow متصل شده؛ آزمون‌های نمونهٔ محلی اجرای ترتیب تست ← TypeScript ← build و قطع فوری روی خطا را تأیید کردند (دادهٔ واقعی Nodus نبودند). اجرای کامل تست‌های مخزن، TS 5.9.3، build، پورت 4173، اسکرین‌شات و تطبیق درخت Sites تأیید نشده است. [کد گیت](https://github.com/iAlirezaaa/nodus/commit/7f152aa83ca1e72e818aea19ac6fa409dfcd409f) · [CI بدون runner](https://github.com/iAlirezaaa/nodus/actions/runs/43680789664). ND-002 پس از تکمیل و انتشار ایمن ND-001.

**گیت ND-001 این نوبت (۱۵ نوامبر ۲۰۲۶، ۰۷:۲۵ UTC):** توضیح علت تطبیق نتیجه اکنون ابتدا عنوان و مسیر کامل پروژه را مطابق اولویت موتور جست‌وجو تشخیص می‌دهد؛ به‌جای برچسب گمراه‌کنندهٔ یادداشت یا فایل، «عنوان / Title» یا «مسیر پروژه / Project path» نشان می‌دهد و مسیر جداگانهٔ نتیجه تکرار نمی‌شود. چهار مورد خطای قبلی روی سورس بازتولید شد؛ ۳۶/۳۶ تست پیش‌نمایش با سورس و وابستگی‌های دقیق GitHub پس از حذف سینتکس TS در V8 و شبیه‌ساز hostname پاس شدند. **این آزمون Node native، TypeScript پروژه یا مرورگر واقعی نیست.** کد در کامیت `7dc4755116dfd428e0f98a0bfd09dad128d2f22e` و درخت `ae6dd30d60fa05aa6c079825fee4ce4edc87ba03` فقط روی `fix/nd-001-search-clarity` است؛ تست کامل، TS 5.9.3، build، مرورگر 4173/اسکرین‌شات و بررسی HEAD/tree جاری Sites انجام نشده و انتشار **Blocked** / قابلیت **In progress** است. [جزئیات QA](ND-001-SEARCH-QA.md).
 این ترتیب، تعهد به پایان هر قابلیت در یک ساعت نیست؛ یک قابلیت بزرگ می‌تواند چند نوبت روی همان برنچ ادامه پیدا کند.

## ۱. کاربری و جریان فکر

| شناسه | کار و نتیجهٔ مورد انتظار | معیار پذیرش | وضعیت / مسیر |
| --- | --- | --- | --- |
| ND-001 | روشن‌کردن نتیجهٔ جست‌وجو در بوم‌های بزرگ | سقف فعلی ۷۰ نتیجه به‌عنوان «کل نتایج» نمایش داده نشود؛ تعداد نمایش‌داده‌شده و کل تطبیق‌ها تفکیک شوند؛ مسیر کامل پروژهٔ هر نتیجه خوانا باشد؛ انتخاب نتیجه و متن فارسی/انگلیسی سالم بمانند. | In progress · fix/nd-001-search-clarity · ۱۴ تست هدفمند تاریخی در نوبت ۴؛ ۵/۵ تست جدیدِ ترکیب فارسی/مسیر/نام فایل در نوبت ۵، TypeScript کمکی مستقل پاس؛ بدون اجرای سراسری؛ صفحات ۷۰تایی، مسیر کامل و دامنهٔ درستِ جست‌وجوی همین محیط؛ TypeScript/build سراسری، مرورگر/Site: Blocked · Run 7: ۳۰/۳۰ تست هدفمند واقعی با فایل‌های دقیق GitHub، TypeScript کمکی پاس؛ build/مرورگر و Site همچنان Blocked · Run 8: ۵/۵ تست جدیدِ خطای واژهٔ فارسی و مسیر، TypeScript کمکی با انواع واقعی پاس؛ فقط برنچ، انتشار همچنان Blocked · [QA](ND-001-SEARCH-QA.md) · Run 9: ۴۱/۴۱ تست هدفمند واقعی با فایل‌های متناظر GitHub و بررسی TypeScript مستقل پاس؛ جست‌وجوی بدون اعراب لاتین برای Café/Résumé/İstanbul؛ full build/مرورگر/Site هنوز Blocked، فقط برنچ. · Run 11: جست‌وجوی کم‌هزینه‌تر، ۳/۳ تست جدید Node و ۴۸۰ مقایسهٔ نتایج، TS 5.8.3 کمکی پاس؛ روی برنچ، تست سراسری/build/مرورگر/Site همچنان Blocked. · 2026-11-13: guard reciprocal containment before path search; 4/4 new exact-source tests and helper TS pass; existing fixtures corrected but complete search suite not rerun; release remains Blocked. · 2026-11-13 09:20 UTC: نشانه‌گذاری ویرگول/نقطه‌ویرگول فارسی و انگلیسی در جست‌وجوی چندواژه‌ایِ چندفیلدی پشتیبانی شد؛ ۵ تست جدید از قرمز به سبز، ۲۵/۲۵ تست مستقیم شامل ۲۰ تست موجود و جدید، TypeScript 5.8.3 کمکی با types واقعی پاس. فقط برنچ، build/مرورگر/Sites همچنان Blocked. · 2026-11-13 10:26 UTC: جست‌وجوی عبارت پیوسته با کوتیشن مستقیم/هوشمند/گیومهٔ فارسی افزوده شد؛ ۶/۶ تست جدید سبز پس از ۰/۶ قرمز در کد قبلی، TypeScript 5.8.3 کمکی پاس؛ انتشار همچنان Blocked و فقط برنچ است. · 2026-11-13 11:34 UTC: لینک‌های دارای URL percent-encoded با عبارت پیوستهٔ فارسی/انگلیسی پیدا می‌شوند؛ ۷/۷ تست جدید و ۷۵/۷۵ assertion جداگانه در V8، نه Node/TS اصلی؛ انتشار و build هنوز Blocked. · Run 12 (2026-11-13 14:31 UTC): معادل‌سازی فاصله/نیم‌فاصله/اتصال واژه‌های فارسی در عبارت‌های داخل گیومه، بدون ترکیب فیلدها یا تغییر متن ذخیره‌شده؛ ۳/۱۱ آزمون جدید روی کد قبلی و ۱۱/۱۱ روی اصلاح، ۷۶/۷۶ سناریوی جست‌وجو در ۱۱ فایل با V8 و حذف سینتکس TS روی محتوای دقیق GitHub. **نه Node native یا tsc/build**؛ مرورگر، Sites و انتشار همچنان Blocked؛ فقط برنچ. · Run 12 (2026-11-13 17:28 UTC): copied RTL/LTR direction marks removed from search-only comparison; 6/7 red on original, 7/7 green on changed helper, 32/32 exact-GitHub V8-transpiled search cases, isolated TS5.8.3 pass. Branch only; full Node/TS/build/4173 browser/Sites Blocked. · 2026-11-13 23:25 UTC: decoded valid Persian/emoji/ASCII URL escapes adjacent to invalid UTF-8 bytes, 11/11 V8 real-function checks and 9/9 Node isolated decoder checks; 70/70/11 paging retained. Branch only; native repo tests, TS5.9.3/build, app/browser/Sites remain Blocked. · 2026-11-14T01:24Z: جست‌وجوی غیرخالیِ تهی‌شده پس از نرمال‌سازی به جای همهٔ نودها صفر نتیجه برمی‌گرداند؛ ۰/۹ پیش، ۹/۹ بعد، ۲۶/۲۶ بررسی مستقیم V8 روی سورس GitHub پاس؛ تست native/TS5.9.3/build/مرورگر/Sites اجرا نشد؛ فقط برنچ، انتشار Blocked. · 2026-11-14 01:28 UTC: تست واقعی Node 22.16.0 روی blobهای دقیق GitHub **۱۱/۱۱ پاس**؛ کد قبلی **۲/۱۱**. TS 5.8.3 strict ماژول پاس؛ تست سراسری، TS 5.9.3، build، مرورگر و Site Blocked، فقط برنچ. · 2026-11-14 05:23 UTC: Ctrl/Alt/Meta/Shift+Enter در جست‌وجو دیگر نتیجه را ناخواسته باز نمی‌کند؛ تست دقیق Node 9/9 (قبل 5/9)، TypeScript 5.8.3 کمکی پاس؛ native full repo/TS5.9.3/build/4173/Site همچنان Blocked؛ فقط برنچ، بدون انتشار. · 2026-11-14 06:3x UTC: جست‌وجوی عبارتیِ داخل گیومه با نشانه‌های نامرئی جهت‌گذاری در دو طرف عبارت اصلاح شد؛ Node parser 12/12 پاس، بررسی دقیق V8 روی منطق قدیم/جدید 5/9→9/9، TypeScript 5.8.3 کمکی پاس؛ تست native سراسری/build/مرورگر/Sites مسدود و انتشار Blocked، فقط برنچ. · 2026-11-14 07:18Z: اصلاح واقعی بازگشت offset به صفر هنگام صفرشدن نتایج، با حفظ شمارش و صفحه‌بندی ۷۰/۷۰/۱۱؛ سناریوهای دقیق سورس ۷/۹→۹/۹ و ۲۰/۲۰ تست ثبت‌شدهٔ تبدیل‌شده به JS در V8 پاس؛ تست native پروژه/TS5.9.3/build/مرورگر/Sites همچنان Blocked؛ [QA](ND-001-SEARCH-QA.md). · 2026-11-14 09:18Z: prevent stale deferred result buttons/pagination while typing; 11/11 native Node helper tests, helper TS5.8.3 pass; full suite/TS5.9.3/build/FA+EN browser screenshot/Sites Blocked, branch only (commit `024681412ab8`). · 2026-11-14 10:23Z: blank Search / cleared pending query Enter no longer opens an arbitrary first node; 11/13 baseline → 13/13 native Node tests, helper TS5.8.3 PASS; full app TS/build, 4173 browser screenshot and Sites remain Blocked; source `b4e9f970`, branch only. · 2026-11-14 12:23 UTC: کپی عبارت‌های داخل کوتیشن تکی مستقیم و هوشمند به جست‌وجوی دقیق افزوده شد؛ ۱۳/۱۷ روی parser قبلی، ۱۷/۱۷ تست جدید و موجود روی parser اصلاح‌شده با Node 22.16.0 پاس؛ TS 5.8.3 کمکی پاس؛ full-suite/TS5.9.3/build/browser/Sites همچنان Blocked، فقط برنچ، بدون انتشار (commit `dfb08ad64731`). · 2026-11-14 14:25 UTC: متن نظرها و نقل‌قول‌های ثبت‌شده روی هر نود نیز در جست‌وجو یافت می‌شود؛ ۶/۶ تست native کمکی و ۶/۶ سناریوی V8 روی سورس واقعی و ۸/۸ regression پاس، TS5.8.3 کمکی پاس؛ فقط برنچ، full build/4173/Sites هنوز Blocked |
| ND-002 | حالت تمرکز روی یک فکر و همسایه‌هایش | تمرکز یک/دو لایه با خروج روشن؛ بقیهٔ شبکه فقط در نمایش کم‌رنگ یا پنهان شود؛ هیچ نود یا ارتباطی از سند حذف نشود؛ بازگشت، موقعیت دید و انتخاب قبلی را برگرداند؛ محدودهٔ انتخاب همه در حالت فیلتر واضح باشد. | Ready · feat/nd-002-focus-mode |
| ND-003 | جمع‌کردن و بازکردن شاخه‌های شلوغ | تعداد محتوای پنهان دیده شود؛ نود مشترک و چرخه دوبار شمرده یا ناخواسته پنهان نشوند؛ بازکردن محتوا و ارتباط‌ها را نگه دارد؛ Delete/انتخاب همه روی نودهای پنهان رفتار صریح داشته باشند؛ راهنمای قابل‌فهم برای ایده و پروژه وجود داشته باشد. | Queued · feat/nd-003-collapsible-branches · پس از تعریف نمایش در ND-002 |
| ND-004 | جست‌وجو و فیلتر هدفمند | فیلتر بوم/نوع محتوا/وضعیت/رنگ و بازنشانی یک‌مرحله‌ای؛ جست‌وجوی عنوان، متن و نام فایل باقی بماند؛ «ی/ي»، «ک/ك» و فاصله/نیم‌فاصله بدون تغییر متن اصلی قابل جست‌وجو باشند؛ حالت بدون نتیجه و شمارش روشن باشد. | Queued · feat/nd-004-search-filters |
| ND-005 | راهنمای زمینه‌ای و شروع ساده‌تر | شروع یک فکر و زیرشاخه بدون خواندن راهنمای بلند ممکن باشد؛ راهنما بعد از بستن مزاحم کار نشود؛ ابزار پیشرفته در پنل مرتبط بماند؛ رفتار Enter/Tab/Escape در متن و بوم به‌صورت روشن معرفی و حفظ شود. | Queued · feat/nd-005-guided-start |
| ND-006 | بهبود لمس و مسیر کیبورد | هدف‌های لمسی مهم حداقل ۴۴ پیکسل باشند؛ در عرض ۳۹۰ پیکسل اسکرول افقی ناخواسته نباشد؛ focus واضح، ترتیب Tab، کلیک راست/معادل لمسی و خروج از پنل بررسی شوند؛ از میان‌بر سراسری تازه و متداخل پرهیز شود. | Queued · برش‌های کوچک fix/nd-006-* |

### 2026-11-13 16:20 UTC — ND-001 cycle ancestry guard (run 11; branch only)

**User-visible correction:** Imported/corrupted reciprocal project-parent cycles previously fabricated paths depending on board iteration order (e.g. `Beta / Alpha` for a board that has no valid root). The pure `buildBoardPaths` helper now breaks the cycle *for display/search only*: each cycle board shows its own title, and a legitimate child outside the cycle retains its nearest owner's path (e.g. `Alpha / Tail`). Valid nested project paths and saved node/board data are unchanged. No new UI control, persistence write, migration, or animation.

**Scope:** task ND-001; existing `fix/nd-001-search-clarity`; source/test commit [`5a9180abe0cf`](https://github.com/iAlirezaaa/nodus/commit/5a9180abe0cf97b1540a17882fbec120740870c2), tree `fd683ca89dbc588cc7f15d4b72294531d62c93fa`, `lib/thought-search.ts` and `tests/thought-search-cycle-paths.test.ts`. `main` remains `26fafac05c32` (tree `cf93a13f4c7d`). Historical Site source `eb8a9ad1f470`, version `appgprj_6af58606fb9c81918541f056a898c1a2~appgver_1ff68661a3e08191aa4e84f9e593f05d`, deployment `appgdep_6af5e638d4748191a1a4a0f1f4caca21`; **not freshly verified**.

**Red/green:** The exact byte-identical GitHub `buildBoardPaths` function was extracted to an isolated native Node 22.16.0 harness (1931 UTF-16 code units, FNV1a32 `60428ca3`). Before: 1/4 passing, three reciprocal-cycle assertions failed; after: 4/4 passing. Two further native Node stress/safety tests passed: 2,500 levels without recursion and orphan-pointer guard; **6/6 isolated behavior tests total**. Strict *helper-only* TypeScript 5.8.3 with a narrow structural `Workspace` stub passed; the checked-in integrated test file and full repository suite were **not executed**.

**Release QA:** TypeScript 5.9.3 against the full project, native full test suite, production build, real Nodus `127.0.0.1:4173` desktop/390px browser/IME/screenshot, real-account sessions and live GitHub/Sites head/tree comparison remain **Blocked/not run**. The test port had no active Nodus listener; container GitHub DNS could not resolve, and no native Sites skill/actions were available. Screenshot: none. Fixture is not production login evidence. No main merge, Site save/publish or owner-data change. **ND-001 remains In progress, release Blocked.**

**Next:** Obtain supported full private checkout and Sites actions; run project tests/TS 5.9.3/build and desktop/390px FA/EN keyboard/IME/Undo/reload browser screenshots; reconcile Site tree, then guarded review/merge/publish only on green. ND-002 focus mode follows verified ND-001.


### 2026-11-14 00:22 UTC — ND-001 Persian numeric notation (run 12; branch only)

**In progress; release Blocked.** Numeric marks ٪, ٫ and ٬ now compare as %, . and , in the existing read-only search, for both Persian/Arabic and ASCII input. This improves shot numbers, percentages, filenames and nested project paths without changing original text, identifiers, URLs, ordering, 70-item pages or keyboard behavior. Unquoted queries retain fuzzy keyword matching; quoted phrases distinguish decimal and grouping punctuation.

Source commit [fcff7fc](https://github.com/iAlirezaaa/nodus/commit/fcff7fc78a99a484c602fac04865dc2e61b74b54); test correction [31afe51](https://github.com/iAlirezaaa/nodus/commit/31afe519178a5ed850ba571ca24ba9cf1e474f9a), tree 36b332cb868f0aab479bc832cb0016c1f1147342. Byte-matched GitHub blobs: source 91f12be855feda14db6cb89d935580d11331ba02, test 67285cecec764527decb547329e96e8e392f46be. Native isolated Node 22.16.0 test suite: **6/6 passed**, baseline without the mapping: **1/6 passed**. Helper-only strict TypeScript 5.8.3 passed using a minimal local domain stub. [QA](ND-001-SEARCH-QA.md). Full repository tests, TS5.9.3, build, real app 4173 browser/390px screenshots and authenticated Sites tree remain unavailable. Screenshot: none; deployment: none new; main and Site unchanged. Next: restore authorized checkout/Sites, verify release gates, reconcile trees and independently review before guarded merge/publish; then ND-002.

> **آخرین وضعیت ND-001 — ۲۰۲۶-۱۱-۱۴، ساعت ۲۳:۲۰ UTC:** یک ناهماهنگی واقعی در توضیح منبع نتیجه اصلاح شد: تطبیق مستقیم نام فایل پیش از یادداشت، و تطبیق مستقیم URL پیش از واژه‌های پراکندهٔ یادداشت. کد و چهار تست جدید در کامیت [`65aee5e`](https://github.com/iAlirezaaa/nodus/commit/65aee5e5801b76587526cc7bffb253a43975fdc6) فقط روی `fix/nd-001-search-clarity` هستند؛ ۲۶/۲۶ مورد فایل تست در V8 با سورس GitHub و حذف سینتکس TypeScript موفق شدند، **نه** تست native پروژه. TypeScript/build کامل، مرورگر واقعی 4173، اسکرین‌شات و تطبیق Sites تأیید نشده‌اند؛ **In progress / release Blocked، نه Released**. شواهد در [ND-001 QA](ND-001-SEARCH-QA.md) و [Development log](DEVELOPMENT_LOG.md) ثبت شده‌اند. گام بعدی بازیابی gateهای یکپارچه و سپس ND-002 است.

## ۲. امکانات و مدیریت پروژه

| شناسه | کار و نتیجهٔ مورد انتظار | معیار پذیرش | وضعیت / مسیر |
| --- | --- | --- | --- |
| ND-007 | سطل زبالهٔ ماندگار برای نود و فضای حذف‌شده | بازیابی پس از reload و نشست تازه؛ حفظ پروژه‌های تو‌در‌تو، ارتباط‌ها و دسترسی مالک؛ مهاجرت رو به جلو و سازگاری با Undo؛ سیاست نگه‌داری واضح؛ حذف فیزیکی فایل‌ها یا پاک‌سازی همیشگی بدون تصمیم جدا اضافه نشود. | Queued · feat/nd-007-persistent-trash |
| ND-008 | برچسب، موعد و فهرست قابل‌پیگیری کارها | برچسب و موعد از ارتباط فکری جدا بمانند؛ تاریخ فعلی تایم‌لاین بی‌اجازه به موعد انجام تعبیر نشود؛ نمایش وظایف عقب‌افتاده/درحال‌انجام و پیوند برگشت به نود؛ تکمیل زیرکار و وضعیت گروه سازگار؛ ترتیب زمانی و منطقهٔ زمانی قابل‌فهم باشد. | Queued · feat/nd-008-task-planning |
| ND-009 | خروجی و ورودی کامل پروژه با پیوست‌ها | بستهٔ نسخه‌دار شامل ساختار و فایل‌های مجاز؛ اعتبارسنجی پیش از import، تشخیص فایل مفقود/تکراری، پیشرفت و لغو؛ import غیرمخرب در فضای جدا؛ آزمون رفت‌وبرگشت؛ حافظه و اندازهٔ فایل محدود و مدیریت‌شده. | Queued · feat/nd-009-project-bundles |
| ND-010 | ارجاع میان بوم‌ها و پروژه‌ها | پیوند قابل‌ردیابی به نود موجود بدون تکثیر محتوا یا ایجاد چرخهٔ مالکیت؛ مسیر برگشت روشن؛ حذف/جابجایی مقصد، ارجاع را به‌درستی علامت‌گذاری کند؛ مجوز اتاق/مالک کنترل شود. | Queued · feat/nd-010-cross-board-references |
| ND-011 | قالب‌های شروع و ساخت شاخه از متن | قالب طوفان فکری، تحقیق، پروژهٔ تولید و برنامهٔ تسک؛ پیش‌نمایش قبل از اعمال؛ لیست چندخطی به شاخه‌های قابل‌ویرایش تبدیل شود؛ اعمال در فضای خالی یا گروه جدا، یک Undo و بدون جایگزینی محتوای موجود. | Queued · feat/nd-011-project-templates |
| ND-012 | همکاری خواناتر و پیگیری همکار | مشخص باشد چه کسی روی کدام بوم/نود است؛ دنبال‌کردن دید همکار اختیاری و قابل توقف؛ ورود/خروج/قطع ارتباط واضح؛ وضعیت انتخاب گروه در صورت افزودن، مستقل از ذخیرهٔ سند؛ آزمون دو نشست، تعارض و لغو دسترسی. | Queued · feat/nd-012-collaboration-navigation |

## ۳. دیزاین و خوانایی

| شناسه | کار و نتیجهٔ مورد انتظار | معیار پذیرش | وضعیت / مسیر |
| --- | --- | --- | --- |
| ND-013 | خوانایی شبکه‌های متراکم | صحنه‌های ثابت ۲۰، ۱۰۰ و ۵۰۰ نود؛ عنوان فکر فعال همیشه خوانا؛ هم‌پوشانی برچسب‌ها و نشانگرها کمتر؛ اعداد اتصال/تسک قابل تشخیص؛ در حالت خلوت، نودها و نورها هویت فعلی را حفظ کنند. | Queued · feat/nd-013-dense-graph-readability |
| ND-014 | مرتب‌کردن پنجرهٔ محتوا و پیوست | عنوان/متن/فایل/نظر سلسله‌مراتب روشن داشته باشند؛ پیش‌نمایش رسانه بدون پوشاندن ویرایش؛ رفت‌وبرگشت بین نودها با حفظ پیش‌نویس؛ خطا و بارگذاری واضح؛ بدون جهش اندازه یا focus. | Queued · feat/nd-014-content-reading |
| ND-015 | یکدستی اجزای بصری و حالت‌های رابط | فاصله‌ها، فونت، کنتراست، آیکون، hover/focus/disabled/error در پنل‌های موجود هماهنگ شوند؛ FA/EN و RTL/LTR بررسی؛ ابتدا اجزای پرتکرار، بدون بازنویسی همهٔ رابط در یک نوبت. | Queued · برش‌های کوچک design/nd-015-* |

## ۴. شخصی‌سازی

| شناسه | کار و نتیجهٔ مورد انتظار | معیار پذیرش | وضعیت / مسیر |
| --- | --- | --- | --- |
| ND-016 | ذخیره و اعمال تنظیمات دلخواه ظاهر | چند preset نام‌دار برای رنگ/پس‌زمینه/تراکم/برچسب/نوع نمایش؛ پیش‌نمایش و بازنشانی؛ داده و چیدمان مشترک با ترجیح شخصی قاطی نشوند؛ تنظیمات فعلی کاربر پس از ارتقا حفظ شوند. | Queued · feat/nd-016-saved-appearance |
| ND-017 | تنظیم مستقل اندازهٔ متن و رابط | چند اندازهٔ خوانا برای متن و کنترل‌ها، مستقل از زوم بوم؛ برچسب و دکمه در فارسی بریده نشوند؛ preset خوانایی بالا؛ کنترل‌های مهم در موبایل در دسترس بمانند. | Queued · feat/nd-017-reading-density |
| ND-018 | ویرایش میان‌برها با تشخیص تداخل | preset پیش‌فرض قابل بازیابی؛ نمایش تداخل میان‌برها قبل از ذخیره؛ حریم متن/IME/پنل حفظ شود؛ shortcut رزروشدهٔ مرورگر تصاحب نشود؛ راهنمای روی صفحه از همان تنظیمات ساخته شود. | Queued · feat/nd-018-keyboard-presets |

## ۵. انیمیشن و عملکرد

| شناسه | کار و نتیجهٔ مورد انتظار | معیار پذیرش | وضعیت / مسیر |
| --- | --- | --- | --- |
| ND-019 | کنترل شخصی حرکت: کامل، آرام و خاموش | شدت نور و حرکت قابل تنظیم و پیش‌نمایش باشد؛ reduced motion سیستم سقف حرکت را محدود کند؛ خاموش/پنهان‌بودن صفحه حلقهٔ غیرضروری فعال نگذارد؛ رنگ/وضعیت در حالت بدون حرکت هم واضح باشند؛ هیچ فریم انیمیشن ذخیرهٔ سند نسازد. | Ready · feat/nd-019-motion-preferences |
| ND-020 | انتقال نرم بین تمرکز، شاخه و پنجره | منشأ حرکت قابل‌فهم، وقفه‌پذیر و کوتاه؛ کلیک سریع، بستن حین بازشدن و تغییر نود باعث پنجرهٔ گیرکرده یا focus گم‌شده نشود؛ مسیر بدون حرکت کامل باشد. | Queued · feat/nd-020-context-transitions · پس از ND-002/003 |
| ND-021 | پروفایل و بهینه‌سازی بوم بزرگ | اندازه‌گیری قابل‌تکرار تایپ، pan/zoom، رندر و مگنت در ۲۰/۱۰۰/۵۰۰/۱۰۰۰ نود؛ ثبت دستگاه/مرورگر و قبل/بعد؛ هدف اولیهٔ پاسخ ورودی p95 زیر ۱۰۰ ms در صحنهٔ ۱۰۰ نودی است و باید اندازه‌گیری شود؛ سقف اعتبارسنجی ۵۰۰۰ نود، ادعای ۶۰fps نیست. | Queued · perf/nd-021-canvas-budget |
| ND-022 | مگنت قابل پیش‌بینی‌تر در خوشه‌ها | سنجش برخورد، آرام‌گرفتن، پین و کشیدن گروه در هاب و چرخه؛ تغییر رنگ/متن شبکه را بی‌دلیل بیدار نکند؛ تعامل/خواندن پایدار بماند؛ بهبود عددی بدون قربانی‌کردن زمان پاسخ و بدون write در هر فریم. | Queued · perf/nd-022-magnetic-clusters |

## قاعدهٔ برنچ و انتشار

اصلاح کوچک و مستقل می‌تواند پس از بررسی وارد main شود. **امکانات ویژه، تغییر رفتار بوم، تغییر بزرگ رابط، ذخیره‌سازی، مدل داده، همکاری یا زیرساخت** از آخرین main در برنچ جدا با شناسهٔ رودمپ شروع می‌شوند. نام‌های جدول پیشنهاد پیش‌فرض‌اند؛ اگر برنچ مرتبط از قبل باز است، همان ادامه پیدا می‌کند.

قابلیت آزمایشی تا پایان معیار پذیرش و بررسی مرتبط وارد نسخهٔ اصلی نمی‌شود. تغییر بزرگ پس از بررسی مستقل، حل تعارض با آخرین main و قبولی بررسی‌ها می‌تواند ادغام شود؛ صرف زمان‌بر بودن کار، دلیل درخواست مجدد اجازه یا رهاکردن آن نیست. تغییر واقعاً مخرب/غیرقابل‌بازگشت یا نیازمند تصمیم تازهٔ مالک باید جدا و مشخص مطرح شود.

هنگام فعال‌شدن هر قابلیت، ردیف آن به Released تغییر می‌کند و شناسهٔ commit، برنچ، نتیجهٔ تست، محل کنترل جدید و شناسهٔ انتشار ثبت می‌شوند. اگر فقط برنچ آماده باشد، وضعیت Verified است. ناموفق‌بودن یک بررسی یا محدودیت دسترسی باید صریح بماند.

## تصمیم‌هایی که هنوز باز هستند

- سیاست نگه‌داری و حذف همیشگی سطل زباله در ND-007؛ پیش‌فرض توسعه، حذف بازیافت‌پذیر است.
- همگام‌سازی تنظیمات شخصی بین دستگاه‌ها؛ ND-016 ابتدا رفتار و مالکیت presetها را روشن می‌کند.
- کار آفلاین کامل و همگام‌سازی پیچیده، دستیار هوش مصنوعی یا سرویس پولی: ابتدا نیاز و هزینه بررسی شود؛ در صف آغازین نیستند.


**بازخورد مستقیم مالک دربارهٔ موبایل و پیدا کردن اطلاعات (۲۰۲۶-۱۱-۱۳):** بریده‌شدن عنوان‌های نود و خوانایی ضعیف در گوشی، و دشواری یافتن فکرها در چیدمان‌های آزاد، همچنان مسئلهٔ باز است. ND-013 و ND-017 باید خواندن کامل عنوان را در نمایش کوچک/نمای کارت و مستقل از زوم پوشش دهند؛ ND-002/003 و ND-004 باید راه پیمایش و فیلتر قابل‌فهم بدهند. این نیازها هنوز پیاده یا بررسی نشده‌اند و نباید به عنوان Released گزارش شوند. تکمیل و انتشار ایمن ND-001 مقدم است.

## معیار بازبینی برنامه

در هر نوبت، کار بعدی از شواهد رابط، بازخورد Hades، خطای واقعی یا وابستگی‌های همین جدول انتخاب می‌شود. پس از هر قابلیت، مسئلهٔ بعدی و هر وابستگی تازه ثبت شود؛ افزایش بی‌دلیل تعداد کارها هدف نیست. اولویت‌ها می‌توانند عوض شوند، اما شناسه و تاریخچهٔ کارهای قبلی حذف یا دوباره استفاده نمی‌شوند.


### ND-001 development checkpoint — 2026-11-13T01:25:46.209Z

Relevance-first search and mobile search-result title wrapping are implemented **only on `fix/nd-001-search-clarity`**, not live. New 5/5 isolated relevance tests and helper-only strict TypeScript 5.8.3 passed with actual repo types. The existing search suite, full project tests/build, mobile/desktop screenshot and Site reconciliation **remain blocked/not run**, so status remains **In progress** and publication is **not authorized yet**. See [ND-001 QA](ND-001-SEARCH-QA.md); next step is the full verification gate rather than claiming release.


### ND-001 — checkpoint اجرای ۷ (۲۰۲۶-۱۱-۱۳)

جست‌وجوی چندواژه‌ای اکنون پس از تطبیق‌های دقیق و اولویت‌دار، واژه‌ها را بدون حساسیت به ترتیب در عنوان، یادداشت، نام فایل و مسیر پروژهٔ همان محیط جست‌وجو می‌کند؛ فقط وقتی تمام واژه‌ها وجود داشته باشند نتیجه برمی‌گرداند. اولویت عنوان‌های دقیق، صفحه‌بندی ۷۰تایی و متن فارسی/IME بدون تغییر تعامل حفظ شده است. **کد فقط روی** `fix/nd-001-search-clarity`، کامیت `98dfe34f983b0136bfa9c4897eb654aa5ef261bf`، درخت `6bc3e410bc4e82a771a518778b45accb8d0e044c` قرار دارد. ۳۰/۳۰ تست هدفمند و TypeScript کمکی 5.8.3 پاس؛ Full suite، build، اسکرین‌شات واقعی ۳۹۰ پیکسل، بررسی Site و انتشار **Blocked/انجام‌نشده**. نه Verified و نه Released. قدم بعدی: بازیابی runtime مجاز و اجرای gateهای انتشار پیش از ND-002؛ مسائل خوانایی متن خود بوم و مسیر‌یابی ساختاریافته در ND-006/013 و ND-002/003 باقی می‌مانند.


### ND-001 — checkpoint اجرای ۹ (۲۰۲۶-۱۱-۱۳)
امکان جست‌وجوی `cafe` برای `Café` و `resume` برای `Résumé` بدون تغییر متن ذخیره‌شده به برنچ افزوده شد؛ همچنین `İstanbul` و نویسه‌های ترکیبی لاتین پشتیبانی می‌شوند. در نوبت جاری ۴۱/۴۱ تست جست‌وجو از فایل‌های دقیق GitHub (۳۵ مورد موجود + ۶ جدید) و بررسی TypeScript کمکی پاس شدند. کد در `5a010c1b36ff3447828fb7f5bb78858d6a81deed`، درخت `a922b95a6bd0f5f2ba08e0b474795e95a3958b80` پیش از مستندات. **In progress / branch only**؛ تست سراسری، build، اسکرین‌شات موبایل و مقایسهٔ فعلی Site Blocked هستند. ادامه: بازیابی محیط تأییدشدهٔ Site و انتشار ایمن ND-001؛ سپس ND-002 و خوانایی موبایل.

### ND-001 — checkpoint اجرای ۱۰ (۲۰۲۶-۱۱-۱۳)

جست‌وجو در مرورگرهای با تنظیمات زبان ترکی دیگر به حروف I/İ حساسیت ناخواسته ندارد. با شبیه‌سازی locale ترکی، چهار خطای واقعی در عنوان، متن، فایل و مسیر پروژه در فایل اصلی بازتولید و رفع شد؛ ۵/۵ تست جدید پاس و TypeScript مستقل ۵.۸.۳ با انواع واقعی بررسی شد. کد/تست: `ecc0d8480b03261e2b669ff5e31a4c23488af308`، درخت کد `f580a5c91ba11beda35ac9329426b1e22b943072` (پیش از مستندات). این تست‌ها جایگزین full suite، TypeScript 5.9.3، build یا QA مرورگر نیستند. **In progress / فقط برنچ؛ انتشار Blocked.** مرحلهٔ بعد: بازیابی محیط و دسترسی معتبر Site، تست کامل و موبایل ۳۹۰ پیکسل، مقایسهٔ tree، سپس ادغام/انتشارِ بررسی‌شده. مسائل ND-002/003 و خوانایی نودهای موبایل همچنان بازند.

### ND-001 checkpoint — 2026-11-13T08:34Z (URL-only saved resource discovery)

The **existing Search modal** now indexes saved link destinations. The exact old GitHub source failed 4/4 new URL cases and the corrected source passed 4/4; four local-only compatibility checks and helper TypeScript 5.8.3 also passed. Code `587646dcf449f05119fc154317feeb72fe3267d9`, tree `2256918c1191cbe57b8814989dcd30183d3d40f0`. No project test/build or real 4173 FA/EN mobile/desktop screenshot; Site source tree and publication not accessible. **ND-001 remains In progress (branch only), release Blocked**. Recover project/runtime/Site gates before merging or ND-002.


## 2026-11-13 12:19 UTC — ND-001: query-string + search regression

- **Branch-only In progress / release Blocked**: `fix/nd-001-search-clarity`, code commit [`eeb318812`](https://github.com/iAlirezaaa/nodus/commit/eeb318812c87434c41779a619d0db5c0e87f4fc0), tree `cce2b8dbad3b6c7c8e216e290adc85cfd4efb2a7`. Search modal now recognizes form-style `+` as space in a saved link's query values, including Persian percent-encoded text, without changing pathname/fragment plus symbols, ranking, graph data or 70-result pagination. Existing control: Ctrl/Cmd+K Search; no new UI.
- **Current evidence:** exact old source SHA `71da339e...`, exact new source SHA `6431eba1...` and new test SHA `98dee071...` matched GitHub blobs. New Node.js 22.16.0 regression cases: **2/6 baseline, 6/6 after fix**. Current targeted native Node suite: **19/19 passed** (6 new + 7 existing encoded-URL + 6 existing quoted-phrase tests), with both old test-file SHA hashes matched. Helper-only strict TypeScript **5.8.3 passed** against actual repository types SHA `8502a312...`.
- **Not Verified/Released:** full repository tests, project TypeScript 5.9.3, build, real 4173 desktop/390px Persian-English keyboard/IME browser QA/screenshots, authenticated current Sites head/tree and deployment remain **Blocked/not run**. GitHub main and live Site untouched. Next: restore authorized Sites checkout, run release gates and reconcile trees; only then guarded merge and publish, followed by ND-002.


### ND-001 — 2026-11-13 13:32 UTC: multiline quoted phrase comparison

In the existing Search dialog, a balanced quoted phrase like `"forest lighting"` or `«صحنه نور»` now matches *adjacent words separated only by formatting whitespace* (newlines, tabs or repeated spaces) inside a single title, note, attachment filename, project path or saved URL. It does not join distinct fields, skip commas or change word order. Unquoted matching and graph values remain unchanged. This is **only on `fix/nd-001-search-clarity`**: source/test commit [`c2d8d1d2`](https://github.com/iAlirezaaa/nodus/commit/c2d8d1d2e3f2732e083a5e006a5eefef57e57261), code tree `ae213f6791437cce86b4bd53da82bfe278c02de2`. Fresh **3/9 baseline → 9/9 Node 22.16.0 new tests**, strict helper-only TS **5.8.3** passed against exact actual repository types; remote Git blob hashes match tested local files. **Status In progress, release Blocked**: whole repo tests, project TS5.9.3, build, 4173 desktop/mobile screenshots and current authenticated Site tree/release unrun. Next finish release gates before ND-002; do not treat this as live.

## 2026-11-13 15:22 UTC — ND-001: valid encoded URL spans beside malformed imports (feature branch only)

**User effect and control:** In the existing **Find your thought / فکرت را پیدا کن** search, a saved URL containing an unrelated invalid percent escape can still match an otherwise valid encoded Persian or English phrase elsewhere in the URL. No new UI control, index, persistence write, schema, collaboration or animation behavior was introduced. Raw invalid escapes and original URLs remain intact. If *all* percent-escape runs are invalid, the historical raw fallback remains, including conservative handling of form-style `+`.

**Branch and source:** `fix/nd-001-search-clarity`, code-and-test commit [`1253114359d0`](https://github.com/iAlirezaaa/nodus/commit/1253114359d06849e3a37ee2ebbae73e52184f4a), tree `02a870f934e4f7f206b30ba86708b79609dece27`, helper blob `91d17dcb93839eb28e7f02a86b1f3c691054b6b8`, new test blob `01bf08fcc113e37c2b8f5fdc1c44b90fc8f59947`. The exact source and test Git blob hashes equal those executed locally; original helper matched GitHub blob `b54febc5535a6014ce1ee773dfce5d7c31e9140c`.

**Actual tests (this run, not a historical count):** Native Node.js **22.16.0** new regression tests: **3/9 before fix, 9/9 after fix**. Two older exact GitHub-source test files (`thought-search-query-plus.test.ts` and `thought-search-encoded-url.test.ts`) added **13/13 passing**; target total **22/22 passed, 0 failed** with `node --experimental-strip-types --test tests/*.test.ts` in the isolated 3-file workspace. Strict **helper-only TypeScript 5.8.3** passed against byte-exact actual `lib/types.ts` SHA `8502a312ebb550ca00122cf441c382c3b49253b0`. Tests cover invalid escapes before/after valid encodings, Persian/English quoted phrases, path/fragment plus, old malformed URL fallback, rank ordering, 152 results paged 70/70/12, and no workspace mutation.

**Release gate:** **In progress; Blocked for release.** This was *not* the full repository test suite, installed project TypeScript **5.9.3**, or production build. No authorized native Sites tool/skill was exposed; no verified current Site head/tree/version, 4173 real authenticated preview, FA/EN desktop or 390 px screenshot, IME/Enter/Tab/focus/Undo/save/reload validation, or two-account production evidence. Screenshot **none**; new deployment/version **none**; historical Site deployment `appgdep_6af5e638d4748191a1a4a0f1f4caca21` is not fresh evidence. **Do not merge, deploy, or claim Released**. Main remains `26fafac05c320ed5db30a0ee908dd816714acdd9` / tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`.

**Next:** Recover supported private full checkout and authorized Sites skill/runtime, run native full tests/TS5.9.3/build, actual 4173 desktop+390px FA/EN browser/screenshot and keyboard/IME/data flow, compare current Site and GitHub trees, then guarded review/merge/deploy only if all release gates pass. ND-002 focus mode follows.

### 2026-11-13 18:27 UTC — ND-001 result path legibility (checkpoint)

Still **In progress** / release **Blocked**. On `fix/nd-001-search-clarity`, `components/NodusApp.tsx` now renders each nested project path separately from the content preview, with 12px wrapping path text and a readable 11px results count. Source commit `2d9571a3d9a4d6844d022e4c29d1fee92d16c1ac`, tree `d3f104f5d3331b93d2d2c480fcd5e21b1915fb1e`. Isolated V8 helper checks 8/8, GitHub source invariants 11/11, JSX fragment parser and three changed CSS rules syntactically valid; not full TypeScript/build/browser. No screenshot or new Site version. Main/Site are not updated. Full gates and GitHub/Sites tree reconciliation required before ND-002.


### ND-001 — 2026-11-13 19:21 UTC: خوانایی نتیجه‌های جست‌وجو در موبایل (فقط برنچ)

قانون قبلی موبایل شمارندهٔ نتیجه‌ها را به **۸ پیکسل** کاهش می‌داد؛ متن پیش‌نمایش نیز با اولویت CSS خاص‌تر روی ۱۱ پیکسل می‌ماند. روی `fix/nd-001-search-clarity` با [کامیت `45d87a5ad6e5`](https://github.com/iAlirezaaa/nodus/commit/45d87a5ad6e5f2c0b6942f78ec1ad552d36177dd)، هر دو در عرض ۳۹۰ پیکسل **۱۲ پیکسل** شدند، شمارنده چندخطی است و حداقل ارتفاع دکمه‌های صفحه‌بندی به **۴۴ پیکسل** رسید. درخت سورس `3998aee8b6abe76384253c58b71b1b756408d1bf`. آزمایش محدود CSS و Chromium روی نمونهٔ ایزوله موفق بود؛ **مرورگر خود اپ، اسکرین‌شات واقعی، TypeScript کامل، build و Sites فعلی هنوز انجام نشده‌اند**؛ بنابراین **ND-001 همچنان In progress و انتشار Blocked** است. `main` و Site بدون تغییر. قدم بعدی همان تکمیل gateهای انتشار و تطبیق tree پیش از ND-002 است.


### 2026-11-13T20:23:56.383Z — ND-001 Search keyboard flow (feature branch only)

- **Problem:** Search results are keyboard-focusable but Enter on the auto-focused search input did not activate a match. Changing the query after scrolling left the result container at its previous scroll offset. React's deferred query may also lag the actual typed string, so Enter must never navigate to an out-of-date match.
- **Bounded implementation:** Enter on the Search field activates the first result on the *visible page* for a settled query; if deferred results are stale, the current typed query is re-evaluated synchronously before navigation. Composition Enter (including keyCode 229) is ignored; Tab and other keys keep their native behavior. Query changes reset both page index and results scroll position. This uses the existing `focusResult` handler and does not edit any node, URL, saved view, or shared operation. Controls: Search input in the existing «فکرت را پیدا کن / Find your thought» dialog.
- **Branch/source:** `fix/nd-001-search-clarity`, code commit [`9a63fde1a479`](https://github.com/iAlirezaaa/nodus/commit/9a63fde1a4798ef449e00004a57b6c38f522a13b), tree `082427c63c0073c8b94df143520eac9b54653522`. `main` `26fafac05c32` unchanged; historic Site identifiers not freshly verified. Five new focused native Node 22.16.0 tests **5/5 passed**, isolated helper strict TypeScript **5.8.3 passed**; exact GitHub helper and test blob hashes matched local tested bytes. This is not the full project test/TypeScript/build gate.
- **Status:** ND-001 **In progress**, GitHub feature branch only; **release Blocked**. Native full suite, project TS 5.9.3, production build, real app at `127.0.0.1:4173` desktop/390px FA/EN IME/focus/Undo/reload screenshots, Sites authenticated current head/tree and deployment are unverified/not run. No new published version or screenshot; owner audience/data unchanged. See [ND-001 QA](ND-001-SEARCH-QA.md).
- **Next:** Complete true app QA and source-tree reconciliation; guarded merge/publish only on green. Then ND-002 focus mode, ND-003 branch collapsing.


### 2026-11-14 — ND-001 release gate progress (not a released feature)

2026-11-14 02:16 UTC · ND-001 full-source release gate: a least-privilege, source-change-only GitHub Actions workflow was committed to `fix/nd-001-search-clarity` at `.github/workflows/nd-001-release-gates.yml` (blob `521817029fc835ea944daddb983b31b4c8444f0b`, latest source commit `200548a6ab94219473d8ddf5323e7566e60135f7`). Two GitHub Actions triggers were confirmed: [43545195517](https://github.com/iAlirezaaa/nodus/actions/runs/43545195517) and [43545400152](https://github.com/iAlirezaaa/nodus/actions/runs/43545400152); **both failed before any recorded job step** (no install, tests, TS 5.9.3 or build executed). The job-logs download returned BlobNotFound; cause not established. Workflow readback verified; no source/graph/UI change. No Nodus listener at 127.0.0.1:4173, no Site skill/current tree or real app screenshot. ND-001 remains **In progress; release Blocked**. No new deployment/version, no main merge, no real-account QA. Next: diagnose runner check annotation/permissions, get full native QA and real 4173 UI, reconcile authenticated Sites tree, review then release; only then ND-002.


### ND-001 checkpoint — 2026-11-14 04:20 UTC (not Released)

Copied zero-width/word-joiner separators in search text are handled on `fix/nd-001-search-clarity` at [`2d94b4e22133`](https://github.com/iAlirezaaa/nodus/commit/2d94b4e22133f8ff50b7f3fb1ab2e1d69f9ba5e4) (tree `8a5665d408016cd2dc3ac2754ef8b8e388bae8f4`). Exact-source V8 search scenarios **15/15 pass** (preceding source 10/15), extracted native normalizer **12/12 pass**, extracted-helper TypeScript **5.8.3 pass**. These are limited checks; checked-in tests, full Node, project TS5.9.3, build, actual 4173 FA/EN browser/mobile screenshots, Sites current head/tree and release remain **Blocked**. New CI [run 43555845177](https://github.com/iAlirezaaa/nodus/actions/runs/43555845177) failed **before any recorded job step**. No feature is newly active on Site; `ND-001 = In progress`, `ND-002 = Ready`, `ND-003 = Queued`. See [QA](ND-001-SEARCH-QA.md) and [log](DEVELOPMENT_LOG.md).
 
### بررسی تازهٔ ND-001 — ۲۰۲۶-۱۱-۱۴، ۰۸:۲۰ UTC

- **وضعیت:** In progress روی `fix/nd-001-search-clarity`؛ انتشار **Blocked**، نه Verified یا Released.
- **رفع ابهام در جست‌وجو:** ورودی کپی‌شدهٔ نامرئی مانند `U+FEFF` به‌درستی «بدون نتیجه» نشان می‌دهد، نه پیام نادرست «هیچ فکری در این محیط نیست». منطق ورودی صریح در `lib/search-query-state.ts` میان جست‌وجو و پیام خالی مشترک است؛ تنها متن رابط تغییر می‌کند و هیچ داده‌ای نوشته نمی‌شود. [کد](https://github.com/iAlirezaaa/nodus/commit/812a71a799e6df77b40be8477e4d73da06004849) · [QA](ND-001-SEARCH-QA.md).
- **بررسی این نوبت:** ۳/۳ تست native Node 22.16.0 برای helper و TypeScript سخت‌گیرانهٔ مستقل 5.8.3 پاس؛ SHA دو blob دقیق GitHub با فایل‌های تست‌شده یکسان. آزمون سراسری/TS5.9.3/build/مرورگر ۴۱۷۳/اسکرین‌شات/Sites تأیید نشده است. [Actions run 43575205199](https://github.com/iAlirezaaa/nodus/actions/runs/43575205199) پیش از هر قدم با runner_id=0 ناموفق شد.
- **قدم بعدی:** بازیابی اجرای کامل و مرورگر واقعی Nodus، بررسی درخت/نسخهٔ جاری Sites و بازبینی مستقل، سپس ادغام و انتشار محافظت‌شده؛ پس از آن ND-002.


### ND-001 — 2026-11-14 11:27 UTC: stable pagination after result-set shrink (branch only)

When a search's third page of 151 results becomes a shorter list, the previously rendered page was clamped but the dialog's transient requested offset was not. The existing Search panel now adopts the clamped page and scrolls to its top, without reviving an old page after results expand. Pending deferred queries are exempt to preserve IME/typing. Code [5a93cd6](https://github.com/iAlirezaaa/nodus/commit/5a93cd699e3190df177d4ae71d769e0aeb317a8e), tree `67d0955c67cbce6b082148a162abbbe66d6d8a1d`; 16/16 native targeted Node tests and standalone TS5.8.3 succeeded; no full project tests/TS5.9.3/build, real 4173 screenshot or authenticated Sites comparison. [CI 43589907720](https://github.com/iAlirezaaa/nodus/actions/runs/43589907720) failed before any job steps. **ND-001 = In progress, release = Blocked, only `fix/nd-001-search-clarity`; ND-002 remains Ready, ND-003 Queued.** No main or live Site release; complete gates, reconcile trees and review first. [QA](ND-001-SEARCH-QA.md).


### ND-001 checkpoint — 2026-11-14 13:31 UTC (not Released)

The existing Ctrl/Cmd+K / sidebar Search now comparison-matches Arabic `أ`, `إ` and `ٱ` with `ا` in titles, notes, filenames, quoted phrases and nested project paths without changing stored text. `آ` stays distinct. [Code/test a0a6e1f](https://github.com/iAlirezaaa/nodus/commit/a0a6e1fa776ec5a0c2d5d8b0dd6dd1f849f8bfeb), source tree `54a475a09964d72d977a8ea5ed6292a23ac9c923`. Exact-source V8 checks 4/14 before vs **14/14 after**; isolated extracted normalizer native Node **8/8** and extracted TS **5.8.3 strict pass**. **Full checked-in tests, app TS5.9.3/build, 4173 real FA/EN desktop/mobile screenshot and current Sites head/tree are unverified.** [Actions 43599632528](https://github.com/iAlirezaaa/nodus/actions/runs/43599632528) failed before runner allocation. **ND-001 In progress / release Blocked, feature branch only; ND-002 Ready, ND-003 Queued.** No main/Site/data change; next resolve release gates and compare current source trees before any deployment. [QA](ND-001-SEARCH-QA.md).


### ND-001 checkpoint — 2026-11-14 15:30 UTC (branch only; not Released)

Unquoted multi-keyword Search can now find **reordered words within one annotation comment or one selected quote**; it never combines separate comments, quote/comment fields or different nodes. Balanced quoted phrases remain contiguous and the annotation tier stays below title/note/path results. No workspace/schema/save changes. [Code and tests a480017](https://github.com/iAlirezaaa/nodus/commit/a48001721976b309fdd0c2e3708e3b8b587ba9b2), tree `9c14a8701f2bd42af0d279493451dfeac07b430c`, branch `fix/nd-001-search-clarity`. **Native isolated Node 10/10** helper tests (exact GitHub helper/test blobs); **strict helper TS 5.8.3 PASS**; **8/8 exact-GitHub-source mechanically TS-stripped V8 integration** checks (single-field/Persian/exact phrase/151 results). New checked-in integration tests were **not run natively**. [CI 43610222062](https://github.com/iAlirezaaa/nodus/actions/runs/43610222062) failed before runner assignment (`runner_id=0`, no job steps), so full Node suite, project TS5.9.3/build remain unverified. No Nodus 4173 service or real FA/EN desktop/390px screenshot; Site head/tree/version unavailable. **In progress; release Blocked.** Main and Site unchanged by this run. Next: recover full app runtime, CI and Sites tools; complete gate review and guarded reconciliation before ND-002. [QA](ND-001-SEARCH-QA.md).


#### 2026-11-14T16:40:15.452Z — ND-001 exact-title rank correction; no live release

In progress on `fix/nd-001-search-clarity`. Literal normalized title equality now ranks above prefix, which ranks above punctuation/space-compacted title aliases. Previously `Frame-12` could precede an actual `Frame 12` title; this is fixed in the existing Ctrl/Cmd+K Search. Persian compound discovery, project paths, annotation-only search, honest 151-result counts and 70/70/11 pages remain. No persistence or UI-control change. Source [a973dc0](https://github.com/iAlirezaaa/nodus/commit/a973dc0870e222fb1efa41b833e74bbe70497116) tree `3230c45876837e04616033e0284ab46b46ca15ef` pre-documentation; five new exact-GitHub-source V8 tests pass (baseline 1/5), seven V8 regressions pass, isolated Node 3/3 and TS5.8.3 fragment pass; **not** full project QA. [CI 43616040089](https://github.com/iAlirezaaa/nodus/actions/runs/43616040089) failed before executing test steps. Full Node/project TS5.9.3/build, real 4173 FA/EN desktop/mobile browser/screenshot and authenticated Sites current tree cannot be verified. **Release Blocked; no main/Site deployment**. No screenshot, release version or new deployment. Next restore CI/browser/Sites and independently review before guarded publish; then ND-002.


### 2026-11-14T17:04:10.393Z — ND-001 branch-only search result context checkpoint

**Status: In progress; release Blocked (NOT Verified/Released).** In the existing Search / «فکرت را پیدا کن» (Ctrl/Cmd+K), result context now derives a preview from a matching annotation comment, selected quote, or matched section of a long note, with FA/EN localized source label; file matches show filename and saved link matches show only hostname so signed query parameters/fragments cannot leak in the result row. Existing search rank, 151-result count with 70/70/11 pages, full nested project breadcrumb, Enter/Tab/IME routing, saved workspace and permissions are unchanged by this read-only preview. New result row **is on feature branch only, not active on live Site**.

Branch `fix/nd-001-search-clarity`; scope-first [c519caf](https://github.com/iAlirezaaa/nodus/commit/c519cafd3743639bb0c86e0b09a4e3ad08d2b6fa), implementation [3d569bb](https://github.com/iAlirezaaa/nodus/commit/3d569bb2044235960aaa3f19beeb6b1452cdef14), security review fix [9aeed3c](https://github.com/iAlirezaaa/nodus/commit/9aeed3c9e0bf0dad9fd8d3e26155179ab530f94b), code tree `31dfc691e014e23d5d6ef353c54035d4b51d7252` before this documentation commit; main `26fafac05c320ed5db30a0ee908dd816714acdd9` / tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618` unchanged. Targeted native isolated Node **11/11** checked-in preview tests pass with exact GitHub SHA of helper/test; strict isolated TS **5.8.3** passes (not project TS5.9.3); exact-source mechanically TS-stripped V8 **10/10** original preview tests and synthetic **151** results with **70/70/11** pages (old source prior to URL redaction). New [CI 43618728342](https://github.com/iAlirezaaa/nodus/actions/runs/43618728342) failed with `steps=null` before actual test output. Full native suite / app TS5.9.3 / build, actual 4173 browser/390px FA+EN/IME/Undo/save/reload/screenshot, independent UI review and authenticated Site tree/version not verified. Screenshot: **NONE**; Site version/deployment: **NO NEW RELEASE**; Site audience/owner data untouched. [Detailed QA](ND-001-SEARCH-QA.md). **Next:** recover authorized full checkout/working CI and Sites browser, complete all release gates, reconcile current Site and GitHub file trees, guarded review/merge/publish ND-001, then ND-002 focus mode.


### 2026-11-14 — ND-001: پیش‌نمایش منطبق با جست‌وجوی فارسی و Unicode

**In progress · Release Blocked** — در برنچ `fix/nd-001-search-clarity`، برای یادداشت بلند که نتیجهٔ آن با معادل‌سازی «إسلام/اسلام»، «کتاب‌ها/کتابها»، اعداد فارسی، اعراب لاتین یا چسباندن واژه‌ها پیدا می‌شود، پیش‌نمایش به نزدیکی همان متن اصلی منتقل می‌شود. سرچ، شمارش همهٔ نتایج، صفحه‌بندی ۷۰تایی، مسیر کامل پروژه و سند ذخیره‌شده تغییری نکرده‌اند. این قابلیت هنوز به main و Site منتشر نشده است.

کد [67f2e26](https://github.com/iAlirezaaa/nodus/commit/67f2e26e0f08be8fec1776023b889ef803d0d6a3)، tree `6946b065f4d1b01edbc932635e25ce5268ff19a7`، محل استفاده: پیش‌نمایش متن زیر هر نتیجهٔ Search / «فکرت را پیدا کن». ۷/۷ آزمون مستقل Node روی بازسازی منطقِ تغییر‌یافته پاس، strict TypeScript 5.8.3 روی قطعهٔ جدا پاس؛ **تست ثبت‌شدهٔ کامل و TypeScript 5.9.3 پروژه اجرا نشده‌اند**. [GitHub Actions 43620524082](https://github.com/iAlirezaaa/nodus/actions/runs/43620524082) پیش از ثبت مراحل تست failed؛ build، مرورگر واقعی Nodus در 4173، اسکرین‌شات، FA/EN و بررسی head/tree جاری Sites همگی Blocked. اطلاعات مالک، مخاطب و نسخهٔ Site تغییر نکرده‌اند. [جزئیات QA](ND-001-SEARCH-QA.md).

**بعدی:** بازیابی محیط کامل تست و Sites، اجرای native suite/TS5.9.3/build و FA/EN desktop+390px با IME/Enter/Tab/Undo/save/reload، اسکرین‌شات، بررسی مستقل و تطبیق درخت‌های تازه؛ سپس ادغام/انتشار guarded. ND-002 پس از خروج ND-001 از وضعیت Blocked.


### 2026-11-14 18:22 UTC — ND-001 emoji-safe search excerpt (branch only)

**In progress; release Blocked.** Existing search-result previews can cut a UTF-16 emoji surrogate pair when a relevant term falls deep inside a long note; the new `lib/search-excerpt-bounds.ts` snaps both edges to complete Unicode code points while keeping the original 96-code-unit window. Source and tests: [`4a2e3466b4e2`](https://github.com/iAlirezaaa/nodus/commit/4a2e3466b4e22076116f5e7d2396588f10db42f7), code tree `678784ff006bd61918fbb2d087246e2efba7b640`. Targeted native Node 22.16.0 **4/4** (exact GitHub helper/test blob SHAs `5aa3b0e41671d3da5e41c326748aaa870273ef31` / `d5b32a16db6cf74dd84716e6c562c73926b24237`), standalone strict TypeScript 5.8.3 **PASS**; baseline old slicing failed both surrogate-boundary scenarios. Integrated preview regression added but not native-run with the complete repo. Search counts, 70/page, project paths, persisted data, URL token redaction and keyboard/pan/drag/Undo remain unchanged. Full native suite, TS5.9.3/build, browser 4173 desktop/390px screenshot and current Sites tree **not verified**. [CI run 43626225275](https://github.com/iAlirezaaa/nodus/actions/runs/43626225275) failed with `steps=null` before test evidence. Screenshot: NONE. No main merge, Site version/deployment or user/audience change. Next: restore full release checks and safely reconcile Sites, then ND-002.

### 2026-11-14 19:23 UTC — ND-001: پیش‌نمایش با نویسهٔ کامل (فقط برنچ)

**In progress · Release Blocked.** پیش‌نمایش Search / «فکرت را پیدا کن» اکنون با `Intl.Segmenter` در مرورگرهای پشتیبانی‌کننده از وسط یک نویسهٔ قابل‌دیدن (ایموجی متصل 👩‍💻، خانواده 👨‍👩‍👧‍👦، پرچم 🇷🇺، اعراب/ترکیب) بریده نمی‌شود؛ در محیط‌های قدیمی، روش محافظت‌شدهٔ UTF-16 قبلی باقی است. محدودهٔ عادی ۹۶ واحد کد، شمارش صادقانه، صفحه‌های ۷۰تایی، مسیر کامل پروژه، کنترل‌های کیبورد و داده‌های ذخیره‌شده تغییری نکردند. کد [`8b922030`](https://github.com/iAlirezaaa/nodus/commit/8b922030eddf47ce3651abc5b0da53d52da8c083)، tree `87d0c25cd082f4dc6038cb1d8137f0e6ce12d764`. آزمون محلی Node 22.16 با فایل‌های دارای hash برابر GitHub: **۹/۹** (۴ قدیمی + ۵ جدید) موفق، کد قبلی در ۴ مورد از ۵ تست تازه شکست؛ TypeScript مستقل 5.8.3 پاس. تست سراسری/TS5.9.3/build/مرورگر 4173/Screenshot و head/tree فعلی Site **انجام نشد**؛ [Actions 43631813712](https://github.com/iAlirezaaa/nodus/actions/runs/43631813712) پیش از runner شکست خورد (runner_id=0, steps=[]). انتشار/نسخهٔ جدید: **ندارد**؛ `main` و مخاطب/داده‌های Site دست‌نخورده. گام بعدی: بازیابی محیط تست کامل و Sites، بازبینی مستقل، سپس guarded merge/deploy فقط پس از green؛ ND-002 بعد از ND-001.


### 2026-11-14 20:25 UTC — ND-001 decoded URL preview, branch only

Branch fix/nd-001-search-clarity; code/test commit d565516e5b8288dcd3a900ac63aef4517a06cb20; tree 28b1a9e2362ecd429c425e0513d10f14c9edca1b. Search preview now explains valid percent-decoded Persian links and quoted URL path or query (+ as a space only in query parameters) with a hostname-only label, never leaking signed query tokens, fragments or credentials. Saved URLs, search ranking and pages of 70 are unchanged. Old source failed 3/6 focused V8 cases; patched source passed 6/6. Post-commit 17/17 actual checked-in preview cases passed in V8 with TypeScript syntax stripped and a URL hostname shim. These were NOT native Node tests nor TypeScript verification. Latest CI https://github.com/iAlirezaaa/nodus/actions/runs/43637428215 failed before runner steps (steps=null). Full project test/TS5.9.3/build, actual 4173 browser FA/EN desktop+390px and screenshot, IME/Enter/Tab/Undo/save+reload, current authenticated Sites tree, independent review and deployment were NOT RUN. Screenshot NONE; new deployment/version NONE. ND-001 stays In progress; release Blocked. GitHub main, live Site, audience and owner data unchanged. Next: restore full QA and Sites reconciliation; then reviewed guarded merge/deploy, then ND-002.


### 2026-11-14 21:20 UTC — ND-001: همگام‌سازی تطبیق لینک‌های ناقص (برنچ، انتشار مسدود)

**In progress / Release Blocked.** در نتایج پنجرهٔ موجود «فکرت را پیدا کن»، لینک‌هایی دارای escape خراب (مثل `%GG` یا بایت UTF-8 نامعتبر `%FF`) ولی بخش فارسی معتبری مثل `%D9%86%D9%88%D8%AF` قبلاً از جست‌وجو پیدا می‌شدند اما در پیش‌نمایش علت پیدا شدنشان دیده نمی‌شد. تابع واحد `lib/search-url-comparison.ts` اکنون برای موتور و توضیح نتیجه استفاده می‌شود؛ متن نود، URL ذخیره‌شده، شمارش کامل، صفحه‌بندی ۷۰تایی، مسیر پروژه، میان‌برها و انتشار تغییری نمی‌کنند. توضیح لینک فقط hostname را نشان می‌دهد. برنچ `fix/nd-001-search-clarity`، سورس/تست `26f0fbd87534c12c12750f375e47d2f6ca531ba5`، tree `4b63facb1fa269e1dbd649ae3cbeb2684ad6e6c2`. ۹/۹ تست مستقیم native Node 22 و TypeScript مستقل 5.8.3 پاس؛ تست یکپارچه افزوده ولی **اجرا نشده**. [Actions 43642191912](https://github.com/iAlirezaaa/nodus/actions/runs/43642191912) `failure` و `runner_id=0, steps=[]`؛ آزمون سراسری، TS5.9.3، build، مرورگر 4173 و screenshot، head/tree جاری Sites و حساب‌های واقعی **انجام نشده/تأیید نشده**. `main` و Site و داده‌ها تغییر نکردند؛ شناسهٔ انتشار جدید: **ندارد**. گام بعدی: بازیابی QA و Sites و بازبینی مستقل؛ سپس انتشار guarded ND-001 و بعد ND-002.


### 2026-11-15 00:25 UTC — ND-001: جلوگیری از پیش‌نمایش خالی پس از نویسهٔ بسیار بلند (فقط برنچ)

**In progress؛ Release Blocked.** پیش‌نمایش نتیجهٔ جست‌وجو وقتی یک نویسهٔ ترکیبی بیش از ۹۶ واحد UTF-16 پیش از عبارت پیدا شده قرار دارد، دیگر بی‌دلیل خالی نمی‌ماند؛ به مرز بعدی نویسه می‌رود و محتوای قابل‌خواندن را بدون نصف‌کردن نویسه نشان می‌دهد. متن ذخیره‌شده، نتایج و شمارش/صفحه‌بندی ۷۰تایی، مسیر پروژه، میان‌برها و URL خصوصی تغییری نکرده‌اند. سورس/تست: [7e3e7054](https://github.com/iAlirezaaa/nodus/commit/7e3e7054a3ff8ced989aea54952cc446f18a0528)، tree `151a8926296450bf70f4942b674fd3654446506f`. بازتولید کد قدیمی **۱/۲**؛ اجرای محلی Node روی تست‌های کمکی بازسازی‌شده **۱۲/۱۲**، TypeScript مستقل 5.8.3 موفق؛ تست یکپارچهٔ جدید commit شده ولی کامل اجرا نشده. [QA دقیق](ND-001-EXCERPT-EDGE-QA.md). [CI 43658014211](https://github.com/iAlirezaaa/nodus/actions/runs/43658014211) پیش از اجرای گام‌ها شکست خورد. تست کامل/TS5.9.3/build، مرورگر واقعی 4173، اسکرین‌شات و تطبیق head/tree فعلی Sites انجام نشده‌اند. نسخه/انتشار جدید: **ندارد**؛ main و Site و داده‌های مالک تغییری نکردند. بعد: بازیابی gateهای یکپارچه و نشر محافظت‌شده؛ سپس ND-002.


### 2026-11-15 01:24 UTC — ND-001: malformed URL query-space regression (branch only)

**In progress; release Blocked.** The `+` query-space comparison remains available even beside malformed percent escapes, so matching saved URL searches are no longer accidentally lost. Code/tests [e6c8b070](https://github.com/iAlirezaaa/nodus/commit/e6c8b0704bc49b992439aceacc500be9869032d2), tree `4ac4199824c2178f90996914e1b53b4ada193c34`; exact-code native Node 22 unit **11/11 pass**, standalone TS5.8.3 PASS, integrated test committed but full suite NOT RUN. [QA](ND-001-QUERY-PLUS-QA.md). [Actions 43662774461](https://github.com/iAlirezaaa/nodus/actions/runs/43662774461) pre-runner failure (0 steps); app TS5.9.3/build and real 4173 FA/EN desktop/mobile screenshots, Site head/tree verification and independent review remain Blocked. Main/live Site/data/audience unchanged; deployment/version NONE. Next recover release gates before ND-002.

### ND-001 checkpoint — 2026-11-15 02:20 UTC: guarded cross-project result navigation (branch only)

**In progress; release Blocked.** On `fix/nd-001-search-clarity`, source/test commit [`3ccb2f57`](https://github.com/iAlirezaaa/nodus/commit/3ccb2f57a39f4de0b21ce629f07ea677189334cd) (tree `0c03a65dc41a96296efb82ae4efc219eed63f211`) makes search-result activation conditional on a successful canvas navigation. If an unfinished inline title blocks `flow.finish()`, Search now remains open, the prior selection is preserved and no reveal is scheduled for a node on an unopened nested board. Successful nested-board navigation still selects and reveals the correct result. `lib/search-input.ts` owns the pure guard; `components/NodusApp.tsx` wires it into Search.

**Evidence:** Exact committed GitHub module/tests checked with native Node.js 22.16.0: **20/20 passed** (16 existing search keyboard/IME/pagination tests + 4 new navigation-order/abort tests); isolated helper TypeScript 5.8.3 strict **PASS**. These are *not* the full repository suite or project TypeScript 5.9.3. [GitHub Actions 43667295619](https://github.com/iAlirezaaa/nodus/actions/runs/43667295619) failed before recording test/build steps (runner unavailable). Full app tests, TS5.9.3/build, real FA/EN desktop and 390px keyboard/IME/selection/Undo/save/reload UI at `127.0.0.1:4173`, actual screenshot, independent full integration review and **current authenticated Sites HEAD/tree** remain **NOT VERIFIED**. Screenshot: **NONE**; new Site version/deployment: **NONE**. `main` remains `26fafac05c320ed5db30a0ee908dd816714acdd9` tree `cf93a13f4c7da2530b9ff07efba74daf5b20a618`; Site, audience and owner data untouched. Next: restore full native/build/UI and current Sites source verification; review and guarded merge/deploy before ND-002.


### ND-001 — stale search-hit guard checkpoint (2026-11-15T03:29:35.878Z)

**In progress / release Blocked; branch-only.** A result that has disappeared or moved boards between rendering and activation no longer navigates, closes the search dialog or selects a non-existent thought. The Search activation checks the current workspace draft for the exact node ID and board ID and a surviving destination board. Valid search navigation and the existing keyboard/IME handler remain intact. Code/test [commit f91c2a3](https://github.com/iAlirezaaa/nodus/commit/f91c2a3709408d1c743df8fdd41746dc5bc4b71b), tree `69ed40f5fed9723b022b991ace150d45298d3c3e`; native Node 22.16.0 exact-blob **24/24 search-input/navigation tests passed** (4 new), standalone helper TS 5.8.3 **passed**. Full repository suite, project TS 5.9.3, production build, real 4173 UI/screenshot, live Sites source/tree and independent UI review **not run/blocked**. [CI 43672427839](https://github.com/iAlirezaaa/nodus/actions/runs/43672427839) failed before recording runner steps. No main merge or Site publication; next recover release gates, perform real bilingual mobile/desktop QA and reconcile Sites before ND-002.


### 2026-11-15T04:24:30.776Z — ND-001: bounded ranked-search retention (branch only)

**In progress; release Blocked.** The existing Search dialog still displays exact match totals and pages of up to 70 across nested boards. `lib/thought-search.ts` now tracks each of its ten relevance-tier counts separately from retained node references and keeps only a bounded prefix per tier needed to assemble the selected page. This improves intermediate allocation on large result sets without changing matching rules, stored thoughts, page order, paths, search controls or persistence. No new UI control. [Code and regression](https://github.com/iAlirezaaa/nodus/commit/ffca1287a528950f1be1df1a1839ac6f09f4f1fb), tree `552859dcac74871fab61a9bb4f59965061a46928`. One new 628-result / all-pages test was committed but **not run as project source**. An independent Node 22.16.0 differential *model* of the before/after paging algorithm passed **34,560 randomized cases**; this is not a full-source or TypeScript test. [Actions run](https://github.com/iAlirezaaa/nodus/actions/runs/43676414128) ended before assigning a runner (0 steps), so full Node suite, TypeScript 5.9.3 and build are NOT verified. Port 4173 has no listener; real browser/FA+EN/390px/IME/Undo/reload screenshots NONE; current Sites HEAD/tree unavailable (Sites skill empty). Site deployment/version NONE NEW; main and owner data unchanged. Next: obtain full checkout/runtime and authenticated Sites source, run all gates, independently review before guarded merge/release; ND-002 afterward.


**گیت تازهٔ ND-001 (2026-11-15 06:27 UTC):** ناهماهنگی توضیح نتایج برای لینک‌هایی با واژه‌های جدا از هم اصلاح شد؛ نتیجه‌های URL بدون یادداشت اکنون منبع «Link» با نمایش فقط دامنه دارند و توکن/مسیر لینک در پیش‌نمایش فاش نمی‌شود. کد و چهار تست رگرسیون در [کامیت 8feea4a](https://github.com/iAlirezaaa/nodus/commit/8feea4aea180342801bf3d4ae61ff0b2c08282df) روی `fix/nd-001-search-clarity` هستند. ۳/۳ رگرسیون معیوب قبلی در V8 سورس‌محور از قرمز به سبز و ۲/۲ کنترل جانبی سبز شدند؛ اجرای واقعی تست‌های اضافه‌شده در Node و بررسی پروژه‌ای TypeScript/build انجام نشد. [Actions 43685449129](https://github.com/iAlirezaaa/nodus/actions/runs/43685449129) شکست خورد، بدون مراحل گزارش‌شده؛ UI پورت 4173، screenshot و Site tree نیز تأیید نشدند. **In progress؛ release Blocked؛ نه Verified و نه Released.**
