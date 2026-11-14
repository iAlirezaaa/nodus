# رودمپ Nodus

آخرین به‌روزرسانی: ۲۰۲۶-۱۱-۱۲ · مالک: Hades · مخزن: [iAlirezaaa/nodus](https://github.com/iAlirezaaa/nodus)

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

**صف آغازین:** ND-001 ← ND-002 ← ND-003. این ترتیب، تعهد به پایان هر قابلیت در یک ساعت نیست؛ یک قابلیت بزرگ می‌تواند چند نوبت روی همان برنچ ادامه پیدا کند.

## ۱. کاربری و جریان فکر

| شناسه | کار و نتیجهٔ مورد انتظار | معیار پذیرش | وضعیت / مسیر |
| --- | --- | --- | --- |
| ND-001 | روشن‌کردن نتیجهٔ جست‌وجو در بوم‌های بزرگ | سقف فعلی ۷۰ نتیجه به‌عنوان «کل نتایج» نمایش داده نشود؛ تعداد نمایش‌داده‌شده و کل تطبیق‌ها تفکیک شوند؛ مسیر کامل پروژهٔ هر نتیجه خوانا باشد؛ انتخاب نتیجه و متن فارسی/انگلیسی سالم بمانند. | In progress · fix/nd-001-search-clarity · ۱۴ تست هدفمند تاریخی در نوبت ۴؛ ۵/۵ تست جدیدِ ترکیب فارسی/مسیر/نام فایل در نوبت ۵، TypeScript کمکی مستقل پاس؛ بدون اجرای سراسری؛ صفحات ۷۰تایی، مسیر کامل و دامنهٔ درستِ جست‌وجوی همین محیط؛ TypeScript/build سراسری، مرورگر/Site: Blocked · Run 7: ۳۰/۳۰ تست هدفمند واقعی با فایل‌های دقیق GitHub، TypeScript کمکی پاس؛ build/مرورگر و Site همچنان Blocked · Run 8: ۵/۵ تست جدیدِ خطای واژهٔ فارسی و مسیر، TypeScript کمکی با انواع واقعی پاس؛ فقط برنچ، انتشار همچنان Blocked · [QA](ND-001-SEARCH-QA.md) · Run 9: ۴۱/۴۱ تست هدفمند واقعی با فایل‌های متناظر GitHub و بررسی TypeScript مستقل پاس؛ جست‌وجوی بدون اعراب لاتین برای Café/Résumé/İstanbul؛ full build/مرورگر/Site هنوز Blocked، فقط برنچ. · Run 11: جست‌وجوی کم‌هزینه‌تر، ۳/۳ تست جدید Node و ۴۸۰ مقایسهٔ نتایج، TS 5.8.3 کمکی پاس؛ روی برنچ، تست سراسری/build/مرورگر/Site همچنان Blocked. · 2026-11-13: guard reciprocal containment before path search; 4/4 new exact-source tests and helper TS pass; existing fixtures corrected but complete search suite not rerun; release remains Blocked. · 2026-11-13 09:20 UTC: نشانه‌گذاری ویرگول/نقطه‌ویرگول فارسی و انگلیسی در جست‌وجوی چندواژه‌ایِ چندفیلدی پشتیبانی شد؛ ۵ تست جدید از قرمز به سبز، ۲۵/۲۵ تست مستقیم شامل ۲۰ تست موجود و جدید، TypeScript 5.8.3 کمکی با types واقعی پاس. فقط برنچ، build/مرورگر/Sites همچنان Blocked. · 2026-11-13 10:26 UTC: جست‌وجوی عبارت پیوسته با کوتیشن مستقیم/هوشمند/گیومهٔ فارسی افزوده شد؛ ۶/۶ تست جدید سبز پس از ۰/۶ قرمز در کد قبلی، TypeScript 5.8.3 کمکی پاس؛ انتشار همچنان Blocked و فقط برنچ است. · 2026-11-13 11:34 UTC: لینک‌های دارای URL percent-encoded با عبارت پیوستهٔ فارسی/انگلیسی پیدا می‌شوند؛ ۷/۷ تست جدید و ۷۵/۷۵ assertion جداگانه در V8، نه Node/TS اصلی؛ انتشار و build هنوز Blocked. · Run 12 (2026-11-13 14:31 UTC): معادل‌سازی فاصله/نیم‌فاصله/اتصال واژه‌های فارسی در عبارت‌های داخل گیومه، بدون ترکیب فیلدها یا تغییر متن ذخیره‌شده؛ ۳/۱۱ آزمون جدید روی کد قبلی و ۱۱/۱۱ روی اصلاح، ۷۶/۷۶ سناریوی جست‌وجو در ۱۱ فایل با V8 و حذف سینتکس TS روی محتوای دقیق GitHub. **نه Node native یا tsc/build**؛ مرورگر، Sites و انتشار همچنان Blocked؛ فقط برنچ. · Run 12 (2026-11-13 17:28 UTC): copied RTL/LTR direction marks removed from search-only comparison; 6/7 red on original, 7/7 green on changed helper, 32/32 exact-GitHub V8-transpiled search cases, isolated TS5.8.3 pass. Branch only; full Node/TS/build/4173 browser/Sites Blocked. · 2026-11-13 23:25 UTC: decoded valid Persian/emoji/ASCII URL escapes adjacent to invalid UTF-8 bytes, 11/11 V8 real-function checks and 9/9 Node isolated decoder checks; 70/70/11 paging retained. Branch only; native repo tests, TS5.9.3/build, app/browser/Sites remain Blocked. |
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
