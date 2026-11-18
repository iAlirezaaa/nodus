# رودمپ Nodus

آخرین به‌روزرسانی: ۲۰۲۶-۱۱-۱۷ · مالک: Hades · مخزن: [iAlirezaaa/nodus](https://github.com/iAlirezaaa/nodus)

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
| ND-001 | روشن‌کردن نتیجهٔ جست‌وجو در بوم‌های بزرگ | سقف فعلی ۷۰ نتیجه به‌عنوان «کل نتایج» نمایش داده نشود؛ تعداد نمایش‌داده‌شده و کل تطبیق‌ها تفکیک شوند؛ مسیر کامل پروژهٔ هر نتیجه خوانا باشد؛ انتخاب نتیجه و متن فارسی/انگلیسی سالم بمانند. | Ready · اصلاح کوچک در main یا fix/nd-001-search-clarity |
| ND-002 | حالت تمرکز روی یک فکر و همسایه‌هایش | تمرکز یک/دو لایه با خروج روشن؛ بقیهٔ شبکه فقط در نمایش کم‌رنگ یا پنهان شود؛ هیچ نود یا ارتباطی از سند حذف نشود؛ بازگشت، موقعیت دید و انتخاب قبلی را برگرداند؛ محدودهٔ انتخاب همه در حالت فیلتر واضح باشد. | Ready · feat/nd-002-focus-mode |
| ND-003 | جمع‌کردن و بازکردن شاخه‌های شلوغ | تعداد محتوای پنهان دیده شود؛ نود مشترک و چرخه دوبار شمرده یا ناخواسته پنهان نشوند؛ بازکردن محتوا و ارتباط‌ها را نگه دارد؛ Delete/انتخاب همه روی نودهای پنهان رفتار صریح داشته باشند؛ راهنمای قابل‌فهم برای ایده و پروژه وجود داشته باشد. | Queued · feat/nd-003-collapsible-branches · پس از تعریف نمایش در ND-002 |
| ND-004 | جست‌وجو و فیلتر هدفمند | فیلتر بوم/نوع محتوا/وضعیت/رنگ و بازنشانی یک‌مرحله‌ای؛ جست‌وجوی عنوان، متن و نام فایل باقی بماند؛ «ی/ي»، «ک/ك» و فاصله/نیم‌فاصله بدون تغییر متن اصلی قابل جست‌وجو باشند؛ حالت بدون نتیجه و شمارش روشن باشد. | Queued · feat/nd-004-search-filters |
| ND-005 | راهنمای زمینه‌ای و شروع ساده‌تر | شروع یک فکر و زیرشاخه بدون خواندن راهنمای بلند ممکن باشد؛ راهنما بعد از بستن مزاحم کار نشود؛ ابزار پیشرفته در پنل مرتبط بماند؛ رفتار Enter/Tab/Escape در متن و بوم به‌صورت روشن معرفی و حفظ شود. | Queued · feat/nd-005-guided-start |
| ND-006 | بهبود لمس و مسیر کیبورد | هدف‌های لمسی مهم حداقل ۴۴ پیکسل باشند؛ در عرض ۳۹۰ پیکسل اسکرول افقی ناخواسته نباشد؛ focus واضح، ترتیب Tab، کلیک راست/معادل لمسی و خروج از پنل بررسی شوند؛ از میان‌بر سراسری تازه و متداخل پرهیز شود. | Queued · برش‌های کوچک fix/nd-006-* |

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

## ۶. GitHub Pages (نسخهٔ مستقل)

| شناسه | خروجی | معیار پذیرش | وضعیت |
| --- | --- | --- | --- |
| ND-023 | نسخهٔ local-first برای GitHub Pages | ابزارهای اصلی نود، پروژهٔ تو‌در‌تو، خروجی/ورودی JSON، ذخیرهٔ مرورگر و تست موبایل؛ انتشار روی آدرس واقعی پس از فعال‌سازی Pages و بررسی نهایی | In progress · `feat/nd-023-github-pages-local-first` · بررسی قبلی ۱۸/۱۸ Node (نوبت پیشین)، این نوبت ۵/۵ Node با fixture همسان و ۵/۵ V8 روی تابع دقیق GitHub، 24/24 مرورگر با ذخیره‌ساز آزمایشی؛ رفع نشت ویرایش ناقص فقط روی برنچ (کد `8f6e61e`، هنوز منتشرنشده)؛ بازیابی JSON اکنون ابتدا منتظر ذخیره‌های قبلی می‌ماند و فقط پس از تأیید ذخیره به سند اعمال می‌شود (`fb8edee4`، فقط برنچ، ۵/۵ تست دقیق V8)؛ در خطای ذخیره سند قبلی/Undo/انتخاب دست‌نخورده می‌ماند؛ بررسی IndexedDB واقعی و Site همچنان Blocked؛ انتشار نسخهٔ قبلی کلاینت در gh-pages موفق (Actions 43968961185)؛ بازشدن URL و IndexedDB واقعی هنوز بررسی نشده؛ امکانات سروری Blocked |
| ND-024 | ایمن‌کردن شروع برنامه هنگام خرابی دادهٔ IndexedDB | اگر دادهٔ ذخیره‌شده نامعتبر یا ناقص باشد، نمایش سند خالی نباید در ویرایش بعدی به‌طور خودکار روی نسخهٔ خراب نوشته شود؛ نسخهٔ خام قابل‌بازیابی بماند و مسیر انتخاب آگاهانهٔ بازیابی/پشتیبان وجود داشته باشد؛ تست red/green خرابی و reload واقعی لازم است. | **In progress** · `fix/nd-024-startup-storage-recovery` · پیاده‌سازی روی برنچ `19b9dc363` (درخت `1c336d2490`)؛ ۱۹/۱۹ آزمون V8 ایزوله روی کد دقیق GitHub موفق، ۷ آزمون Native ثبت ولی اجرا نشده؛ مرورگر ۴۱۷۳/IndexedDB و تست کامل TypeScript/build و Site **Blocked**؛ انتشار انجام نشده؛ برش تازهٔ ایمنی خروجی خام: `c62d7e6` درخت `4447da71`، ۵/۵ خطای بازتولیدشدهٔ پیشین، ۱۵/۱۵ سناریوی V8 جدید و ۳/۳ تست ثبت‌شده تحت V8 mock موفق؛ ۴ تست Native در فایل جدید ثبت ولی هنوز با Node اجرا نشده؛ JSON ناسازگار دیگر اجازهٔ reset/import نمی‌دهد؛ QA: [ND-024 JSON integrity](ND-024-RAW-JSON-QA.md)؛ **بدون انتشار، UI/IndexedDB واقعی، TypeScript و build همچنان Blocked**؛ اصلاح تشخیص رکورد `undefined` موجود به‌جای رکورد غایب، برنچ `4271ccc3`، بازتولید native Node قدیم ۳/۵ و جدید ۵/۵؛ `getKey` و خطای آن fail-closed؛ روی Site/Pages منتشر نشده؛ QA: [ND-024 undefined-key](ND-024-IDB-UNDEFINED-QA.md)؛ برش تازهٔ بازگردانی فوکوس Search روی برنچ: `485e5254`، درخت `0c7d1d4c`؛ خروج از Escape/Close/backdrop به فوکوس قبلی برمی‌گردد و انتخاب نتیجه روی مقصد باقی می‌ماند؛ ۱۱/۱۱ آزمون ایزولهٔ V8 روی کد و تست دقیق GitHub موفق؛ تست بومی، TypeScript/build، مرورگر واقعی ۴۱۷۳/IME/RTL/mobile/IndexedDB و Site همچنان **Blocked**؛ [QA فوکوس جست‌وجو](ND-024-SEARCH-FOCUS-QA.md)؛ **بدون انتشار**؛ رفع refocus پس از بستن سریع Search در فریم معوق، commit `e8322de6`، درخت `ca94aa1e`، **۷/۷ V8 ایزوله**، JS/CSP PASS و تست جدید ثبت شد؛ تست native/TypeScript/build/مرورگر ۴۱۷۳ و اسکرین‌شات/Sites **Blocked**؛ [QA race فوکوس](ND-024-SEARCH-FOCUS-QA.md)؛ **فقط برنچ و بدون انتشار** |

**تفاوت نسخه‌ها:** GitHub Pages سرور اصلی را اجرا نمی‌کند؛ نسخهٔ محلی با حساب‌های Site، D1/R2 و همکاری آنلاین یکسان نیست. داده‌های کاربر بدون تأیید صریح منتقل نمی‌شوند.

## قاعدهٔ برنچ و انتشار

اصلاح کوچک و مستقل می‌تواند پس از بررسی وارد main شود. **امکانات ویژه، تغییر رفتار بوم، تغییر بزرگ رابط، ذخیره‌سازی، مدل داده، همکاری یا زیرساخت** از آخرین main در برنچ جدا با شناسهٔ رودمپ شروع می‌شوند. نام‌های جدول پیشنهاد پیش‌فرض‌اند؛ اگر برنچ مرتبط از قبل باز است، همان ادامه پیدا می‌کند.

قابلیت آزمایشی تا پایان معیار پذیرش و بررسی مرتبط وارد نسخهٔ اصلی نمی‌شود. تغییر بزرگ پس از بررسی مستقل، حل تعارض با آخرین main و قبولی بررسی‌ها می‌تواند ادغام شود؛ صرف زمان‌بر بودن کار، دلیل درخواست مجدد اجازه یا رهاکردن آن نیست. تغییر واقعاً مخرب/غیرقابل‌بازگشت یا نیازمند تصمیم تازهٔ مالک باید جدا و مشخص مطرح شود.

هنگام فعال‌شدن هر قابلیت، ردیف آن به Released تغییر می‌کند و شناسهٔ commit، برنچ، نتیجهٔ تست، محل کنترل جدید و شناسهٔ انتشار ثبت می‌شوند. اگر فقط برنچ آماده باشد، وضعیت Verified است. ناموفق‌بودن یک بررسی یا محدودیت دسترسی باید صریح بماند.

## تصمیم‌هایی که هنوز باز هستند

- سیاست نگه‌داری و حذف همیشگی سطل زباله در ND-007؛ پیش‌فرض توسعه، حذف بازیافت‌پذیر است.
- همگام‌سازی تنظیمات شخصی بین دستگاه‌ها؛ ND-016 ابتدا رفتار و مالکیت presetها را روشن می‌کند.
- کار آفلاین کامل و همگام‌سازی پیچیده، دستیار هوش مصنوعی یا سرویس پولی: ابتدا نیاز و هزینه بررسی شود؛ در صف آغازین نیستند.

## معیار بازبینی برنامه

در هر نوبت، کار بعدی از شواهد رابط، بازخورد Hades، خطای واقعی یا وابستگی‌های همین جدول انتخاب می‌شود. پس از هر قابلیت، مسئلهٔ بعدی و هر وابستگی تازه ثبت شود؛ افزایش بی‌دلیل تعداد کارها هدف نیست. اولویت‌ها می‌توانند عوض شوند، اما شناسه و تاریخچهٔ کارهای قبلی حذف یا دوباره استفاده نمی‌شوند.

### 2026-11-17 04:13 UTC — ND-024 read-retry safety checkpoint

**In progress, branch only:** non-destructive re-read control added to the existing IndexedDB recovery modal, including a focusable action for raw records that cannot be exported as JSON, stale-backup revocation and concurrent-retry guard. QA: [ND-024 retry](ND-024-RECOVERY-RETRY-QA.md). 11 V8 assertions and inline CSP verified; newly checked-in Node cases, full TypeScript/build, native IndexedDB/browser 4173 and hosted Site verification remain blocked. No release or version ID.

### 2026-11-17 05:20 UTC — ND-024 startup read failures (branch only)

**In progress:** Generic IndexedDB open/read errors now fail closed and show a useful retry-first FA/EN recovery hint rather than exposing an editable blank workspace. Source-exact V8 4/4 startup, 2/2 mutation/save gates and 4/4 modal cases passed; three regression tests checked in but native runner/full TS/build/real 4173 IndexedDB & Site parity **Blocked**. No release; QA: [ND-024 read failures](ND-024-READ-ERROR-QA.md).

**Committed checkpoint:** [code `9640e48218c0`](https://github.com/iAlirezaaa/nodus/commit/9640e48218c04e61d7db6a0add60a3555636ff7f), tree `04b9062c08988aa7fcd6d384a8d0ff4405c4fd97`, 4/4 exact committed startup + 2/2 guarded writes + 4/4 FA/EN modal mocks, CSP digest PASS; screenshot **none**, native Node project runner/TS/build/4173/Sites **Blocked**. Branch-only, not Verified/Released. Next: checkout full source, run native tests/build and real IndexedDB recovery at 4173.

### 2026-11-17 06:18 UTC — ND-024 retry and stale raw safety (branch only)

**In progress / release Blocked:** a generic error while retrying quarantined IndexedDB now clears an earlier raw snapshot and download confirmation instead of allowing a potentially stale backup to authorize Import/Reset. Newly captured corrupt raw remains exportable; successful retry stays read-only. Committed [`ae4466cd65d741a9eb7eae3ce5cdb274e7afbe35`](https://github.com/iAlirezaaa/nodus/commit/ae4466cd65d741a9eb7eae3ce5cdb274e7afbe35) (tree `e2ab299457939ded15b532a0cdf501a8ad86bf06`). QA: [stale retry](ND-024-STALE-RETRY-QA.md). Source-exact V8 23/23, isolated Node22 5/5, JS/CSP PASS; checked-in suite, full TS/build, browser 4173/IndexedDB/screenshot and Site tree/audience **not verified**; no deployment. Next recover release gates; do not mark Verified/Released.

### 2026-11-17 07:21 UTC — ND-024 stale-backup overwrite protection

**In progress · branch only, release Blocked.** Existing recovery Import/Start fresh now validates the previously backed-up raw IndexedDB record **inside the replacement readwrite transaction**, aborting if another tab changed/deleted it or it cannot be re-read; original graph and Undo remain and stale permission is revoked. Code `21b71458` (tree `79f975c1`), test-harness follow-up `327e9d0` (tree `4e7eb73e4d19c00389ab6f8b62deb578958e8b1b`), [QA](ND-024-GUARDED-RECOVERY-QA.md). Exact-source V8 9/9; 3 new checked-in Node cases **NOT RUN**. No Site/Pages/main release, no deployment ID/screenshot. Native test/build, real 4173 two-tab IndexedDB and hosted Site tree/audience checks remain Blocked. Next: complete these gates and independently review before integration. This protects the usability/data-integrity axis; does not claim a new feature in design, customization or animation.

### 2026-11-17 08:25 UTC — ND-024 failed-save truthfulness (branch only)

**In progress / publication Blocked.** `pages/index.html` now distinguishes failed from acknowledged queued IndexedDB saves; ordinary JSON import refuses to overwrite pending edits after a failed write, while the existing Details **Save** action can retry and waits to report success. Scope commit `76fe61d0`, source/test commit [`48a96d14`](https://github.com/iAlirezaaa/nodus/commit/48a96d148907f3fdb45ef737d63ee3e26dcf354f) (tree `ae3d6a4b`). Old source: one unsafe replacement write; patched: zero. Source-exact V8 **6/6**, inline parse and CSP PASS; **four new native Node tests added but NOT RUN**, whole Node/TypeScript/build, real 4173 IndexedDB/FA-EN screenshots and Site tree/audience **Blocked**. No live version, deployment ID or screenshot. QA: [pending-save guard](ND-024-PENDING-SAVE-QA.md). Next recover real release checks; do not mark Verified/Released.

### 2026-11-17 09:17 UTC — ND-024 جلوگیری از خروج ناخواسته با تغییرات ذخیره‌نشده

**In progress / فقط برنچ؛ انتشار Blocked.** در نسخهٔ محلی، تا پیش از تأیید ذخیرهٔ آخرین وضعیت نودها، Undo یا Redo، خروج یا reload باید هشدار خود مرورگر را فعال کند؛ پس از ذخیرهٔ موفق، هشدار برداشته می‌شود. این تغییر در `fix/nd-024-startup-storage-recovery` در کامیت [`c0a29901`](https://github.com/iAlirezaaa/nodus/commit/c0a29901a610cde8b58a3775a2a147cd025f4e00) قرار دارد. بررسی V8 روی سورس ثبت‌شده **۱۵/۱۵**، JS و CSP موفق؛ سه تست Node جدید **اجرا نشده‌اند**. TypeScript/build، ذخیرهٔ واقعی در مرورگر پورت ۴۱۷۳، اسکرین‌شات و بررسی همگامی Sites هنوز **Blocked** است؛ نسخهٔ زنده و داده‌های مالک تغییر نکردند. [QA](ND-024-UNSAVED-EXIT-QA.md). قدم بعد: اجرای تست بومی و بررسی واقعی خروج/reload و ثبت وضعیت Sites پیش از انتشار.

### ۲۰۲۶-۱۱-۱۷ · ND-024 — محافظت از Import معمولی در برابر تب دوم (فقط برنچ)

**In progress / publication Blocked.** در نسخهٔ مستقل local-first، Import معمولیِ JSON دیگر به‌شکل بی‌قید روی رکورد جدیدترِ IndexedDB نمی‌نویسد. آخرین نسخهٔ مشاهده/ذخیره‌شده در تب نگهداری می‌شود؛ پس از پایان صف ذخیره، مقایسه با رکورد فعلی و نوشتن Import در یک تراکنش `readwrite` انجام می‌شود. اگر تب دیگر رکورد را تغییر داده، حذف کرده، یا برای نخستین بار ساخته باشد، Import رد می‌شود و سند/Undo/انتخاب و دادهٔ دیسک دست‌نخورده می‌مانند. ذخیرهٔ خودکار آن تب تا خروجی JSON و reload متوقف می‌شود؛ خروجی هنوز در دسترس است. محل کنترل: همان **Import JSON** قبلی، بدون دکمه یا میان‌بر جدید.

کد فقط روی برنچ `fix/nd-024-startup-storage-recovery`: [`04ae00fa`](https://github.com/iAlirezaaa/nodus/commit/04ae00fa3025bdefc1686fbf139dd3770e86f8eb)، درخت `a58d31d74b37af1b9deae78314fdb9fd6bbdad93`. بازتولید red/green از سورس پیش/پس: قبلی ۱ بازنویسی، جدید ۰؛ **۱۰/۱۰ سناریوی V8** و **۶/۶ اجرای V8 تست‌های جدید** موفق، syntax/CSP موفق. ۶ تست جدید Node ثبت شده اما **native runner هنوز اجرا نشده**؛ تست کامل/TS/build، IndexedDB واقعی دو تب در `127.0.0.1:4173`، screenshot، بازبینی مستقل و head/tree/audience Sites **Blocked / UNVERIFIED**. نسخهٔ منتشرشده: **هیچ**؛ GitHub main، Site اصلی، gh-pages و داده‌های مالک بدون تغییر. [QA](ND-024-ORDINARY-IMPORT-CONFLICT-QA.md). قدم بعدی: بازیابی checkout مجاز و Sites، اجرای تست بومی و مرورگر واقعی و انتشار تنها پس از همهٔ gateها.

### ۲۰۲۶-۱۱-۱۷ · ND-024 — محافظت از ذخیرهٔ خودکار در برابر تب دوم (فقط برنچ)

**In progress؛ انتشار Blocked.** ایراد تازه: برخلاف Import، ذخیرهٔ معمولی IndexedDB هنوز بدون بررسی تغییرات تب دیگر می‌نوشت. اکنون ذخیرهٔ خودکار از baseline تأییدشده و مقایسه/نوشتن اتمیک در تراکنش واحد استفاده می‌کند؛ تعارض، ذخیرهٔ بعدی را متوقف و هشدار خروج و خروجی JSON را حفظ می‌کند. کنترل جدیدی ندارد و از مسیر **Save و ذخیرهٔ خودکار** اجرا می‌شود. کد `46a642a956972b7c74675b8c20cdfc842dc2c1a3`، درخت `f056e888cbd81cd91995deb31522b14b634b6b77`. بازتولید پیش از اصلاح: **۱ overwrite**؛ پس از اصلاح: **۰**. **۶/۶ تست native Node22 روی کد استخراج‌شدهٔ تطبیق‌داده‌شده با GitHub** موفق؛ **۷ تست جدید ثبت‌شده هنوز با runner بومی اجرا نشده‌اند**. JS/CSP بررسی شد. TypeScript/build کامل، مرورگر و اسکرین‌شات واقعی ۴۱۷۳، درخت/نسخه Sites و بازبینی مستقل هنوز Blocked هستند؛ **هیچ تغییری فعال یا منتشر نشده**. [جزئیات QA](ND-024-ORDINARY-SAVE-CONFLICT-QA.md). بعدی: runner کامل، مرورگر دو تب و سپس بررسی مستقل انتشار.

### 2026-11-17T12:35:06.479Z — ND-024: keyboard focus and duplicate Enter guard (branch only)

**In progress / release Blocked.** Static Pages shortcuts previously captured Enter on focused toolbar/Save/Export buttons, created duplicate siblings from already-handled node Enter and swallowed native Shift+Tab; isolated IME and already-prevented events also leaked into graph commands. `pages/index.html` now executes graph shortcuts only on the canvas/idea card, honors IME/`defaultPrevented`, and limits child creation to forward Tab. No new control or schema. Scope `00333daf`; code `7e646c2f` / corrected test `d8f0a39d` (tree `70cabc206eb4eae586621efca9034c4a92bcfa53`). Exact-source V8 red **8/12 failed**, green **12/12 pass**; five checked-in tests simulated in V8 **5/5 pass**, **native runner NOT run**. JS syntax and independent CSP PASS. [QA](ND-024-KEYBOARD-CONTEXT-QA.md). TypeScript/build, actual 4173 browser keyboard + FA/EN/390px screenshots, IndexedDB two tabs and Sites tree/audience remain **Blocked/UNVERIFIED**. No screenshot/deployment/version, no main/Site update; next restore full release gates and review. This improves usability/keyboard reliability; it does not complete ND-024 or newly release design, personalization or motion work.


### 2026-11-17 15:24 UTC — ND-024 جست‌وجوی کیبوردی در نسخهٔ Pages (فقط برنچ)

**In progress · انتشار Blocked:** فوکوس پنجرهٔ Search اکنون با Tab/Shift+Tab در محدودهٔ کنترل‌ها و نتایج پویای خود می‌ماند؛ Ctrl/Meta/Alt+Tab، Enter و IME حفظ شدند. کنترل جدیدی اضافه نشده؛ این اصلاح روی همان پنجرهٔ جست‌وجو در نسخهٔ آزمایشی local-first است، نه Site زنده. کد `d42b21eb`، درخت `6016ccb4e1656a935b8bd41bedc332579dac50a5` و [QA](ND-024-SEARCH-TAB-QA.md). ۱۲/۱۲ سناریوی فایل تست در V8 ایزوله و ۹/۹ Node22 ایزوله برای تابع دقیق GitHub موفق؛ تست کامل مخزن/TypeScript/build، مرورگر واقعی پورت ۴۱۷۳، اسکرین‌شات و تطبیق Sites انجام نشده‌اند. نسخهٔ انتشار: **هیچ**. گام بعد: اجرای gateهای واقعی و بازبینی مستقل، سپس در صورت تأیید انتشار محافظت‌شده.


### 2026-11-17 18:23 UTC — ND-024: ایمنی Enter/Tab همراه کلیدهای کمکی (فقط برنچ)

**In progress / انتشار Blocked.** در نسخهٔ مستقل local-first، Ctrl/Meta/Alt+Enter و Ctrl/Meta/Alt+Tab دیگر به‌اشتباه نود خواهر/فرزند نمی‌سازند؛ Shift+Enter در بوم و روی کارت فرمان ساخت نود را اجرا نمی‌کند. handler کارت، Enter حین IME فارسی، رویداد قبلاً مدیریت‌شده و fallback کد ۲۲۹ را نیز نادیده می‌گیرد. Enter/Tab معمولی بدون تغییر باقی مانده‌اند. اصلاح در `pages/index.html` و آزمون جدید در `tests/pages-keyboard-context.test.mjs` روی `fix/nd-024-startup-storage-recovery`: scope `6a0ea46a`، کد `6fcaa1ba` و اصلاح بازبینی `d35af5e2`، درخت `1ab02e5b3a11b38eea295c9e204b03a3b1812b58`. پیش از اصلاح ۱۱ رویداد کمکی نود ناخواسته ساخت؛ پس از اصلاح ۱۶/۱۶ سناریو بدون ساخت نود، ۳/۳ عمل عادی محفوظ. آزمون Node 22 ایزولهٔ source-exact **۲۳/۲۳** و اجرای V8 بدنهٔ شش تست ثبت‌شده با façade **۶/۶** موفق؛ این اعداد **تست کامل مخزن یا اجرای بومی فایل ثبت‌شده نیستند**. JavaScript و CSP صحیح. جزئیات: [QA](ND-024-MODIFIED-KEYBOARD-QA.md). TypeScript/build، مرورگر واقعی ۴۱۷۳، دو تب IndexedDB، اسکرین‌شات و Site HEAD/tree/audience **Blocked/UNVERIFIED**. هیچ انتشار، نسخه یا تغییر `main` و Site انجام نشده؛ ND-024 همچنان In progress است. قدم بعدی: بازیابی checkout و اجرای gateهای کامل، بررسی مستقل و سپس تطبیق Sites پیش از هر ادغام.

### 2026-11-17T19:21:21.840Z — ND-024 media-rich local backup import gate (branch only)

**In progress / release Blocked.** The optional local-first Pages importer previously refused valid exports containing three near-5 MiB media attachments because of a 15 MiB whole-file cap; it now accepts up to **64 MiB** and rejects larger files before reading. Existing Import JSON control, validation, confirmation and transaction safeguards remain. Code [`c9fc0b92b5`](https://github.com/iAlirezaaa/nodus/commit/c9fc0b92b51a97f0fb90cc3073dc23cfbb8c0a84), tree `cceaa4f5d769a8e4c392fbede65868ae22906ab0`, [QA](ND-024-LARGE-BACKUP-QA.md). 6/6 source-exact V8 cases and 6/6 native Node 22 **extracted-handler** cases passed; four checked-in tests added but their full native file/TypeScript/build and real browser/IndexedDB/Sites gates **NOT RUN**. Screenshot/version/deployment **NONE**. Branch only, not Verified or Released. Next validate actual files/undo/reload across two tabs, 4173 FA/EN/390px browser and full build before independent review.

### 2026-11-17T20:20:38.433Z — ND-024 Media upload race (In progress / release Blocked)

On the branch-only local-first Pages **Details → Media** path, asynchronous FileReader no longer attaches a selected file to an unrelated thought when the user changes selection or project while the read is pending. It cancels with an FA/EN message and **zero** graph/save/Undo writes; stable upload, size/MIME limits are unchanged. Before fix: A→B wrongly mutated B once. Patch [`68c6d0f74d16`](https://github.com/iAlirezaaa/nodus/commit/68c6d0f74d1634e365a1037b670e4f74d9cb8dd4), corrected regression [`616c45bb7f9d`](https://github.com/iAlirezaaa/nodus/commit/616c45bb7f9d410526a3b1bde526b149547412b8), code+test tree `a7f40adb9aaaf4080d490598bef49ecca61c114c`, [QA](ND-024-MEDIA-TARGET-RACE-QA.md). **8/8 source-exact V8 scenarios and 8/8 checked-in test bodies under V8 facades passed; native full suite/TypeScript/build, real browser 4173 FA/EN 390px screenshot/reload, two-tab IndexedDB, independent review and Site HEAD/tree/audience remain Blocked/UNVERIFIED.** Screenshot NONE, published version/deployment NONE. `main` and Site unchanged; this remains In progress, NOT Verified/Released. Next restore the full native/browser/Sites gates, then review and integrate only if passed.

### 2026-11-17 21:21 UTC — ND-024 overlapping media reads (In progress / release Blocked)

An additional **branch-only** static Pages safeguard now gives the **latest** media selection priority over an older FileReader that finishes late; an invalid newer selection also cancels the older pending read. This prevents an older attachment from silently replacing the user's newer choice on the same thought. Existing Details → Media selection/board checks stay in place; no graph or storage write occurs on stale completion. [Scope](https://github.com/iAlirezaaa/nodus/commit/88963f7421ef20270708e7f5508855e1aa92706e) · [code/tests](https://github.com/iAlirezaaa/nodus/commit/15c8363ffef6cea32dde6be7799d19b3576b7ab4) · [QA](ND-024-MEDIA-OVERLAP-QA.md). Prepatch isolated native Node **1/3**, patched **3/3**, **12/12 checked-in test bodies under V8 facades** (not native full suite); whole inline parse and CSP PASS. Full native tests/TypeScript/build, real 4173 FA/EN desktop/390px and IndexedDB two-tab screenshot, independent review, Sites tree/audience remain Blocked/UNVERIFIED. No new version or Site release. **ND-024 remains In progress on `fix/nd-024-startup-storage-recovery`, not Verified/Released.**

### 2026-11-17 22:19 UTC — ND-024 stale JSON import read protection (In progress, unreleased)

Existing static Pages **Import JSON** now invalidates a previously pending file read whenever a later backup is selected. Late A after newer B no longer prompts or restores obsolete data; later invalid/oversized file also cancels the older read. No new control or storage writes on stale completion. Scope [`1b30d2b`](https://github.com/iAlirezaaa/nodus/commit/1b30d2b76064ded50327961043a92e83c0dd28e8), code/tests [`84710cc`](https://github.com/iAlirezaaa/nodus/commit/84710cc00f009adda7dd7904c956f277ede385da), tree `428c1c8363899d7a995cf61033f042924052f4e0`, [QA](ND-024-IMPORT-OVERLAP-QA.md). Native Node22 **6/6 isolated handler tests**, exact-source V8 **7/7 checked-in bodies**, full script parse and CSP passed. Full native tests/TypeScript/build, real 4173 FA/EN + 390px browser/two-tab IndexedDB screenshot, independent review and Site tree/audience **Blocked/UNVERIFIED**. **ND-024 stays In progress, not Verified or Released**; GitHub main and live Site untouched, deployment/version **NONE**. Next complete gates, then safe integration; separately assess already-started restore transaction cancellation if required.

### 2026-11-17T23:26 — ND-024: پیام ایمن هنگام بازیابی در حال انجام (فقط برنچ)

**In progress / انتشار Blocked.** در نسخهٔ آزمایشی Pages، اگر بازیابی JSON تأییدشده هنوز در تراکنش ذخیره‌سازی باشد، انتخاب پشتیبان دوم پیش از خواندن/تأیید رد می‌شود و پیام روشن فارسی/انگلیسی می‌دهد. پیش‌تر پشتیبان دوم دوباره تأیید می‌شد اما ذخیره نمی‌شد و کاربر به‌اشتباه تصور می‌کرد جایگزین شده است. کنترل موجود: **Import JSON**؛ کنترل یا دادهٔ جدیدی افزوده نشده. کد و آزمون [`bc1b1dc1`](https://github.com/iAlirezaaa/nodus/commit/bc1b1dc17b1435829cf342abc73a714ae7b5ce49)، درخت `400dc566ccea2802adb1833f2d0b3c39df1e19c0`، [QA](ND-024-RESTORE-BUSY-QA.md). آزمون V8 عین سورس **۵/۵**؛ ۶ تابع تست ثبت‌شده با façade **۶/۶**؛ JS/CSP موفق. تست بومی کامل، TypeScript/build، مرورگر واقعی ۴۱۷۳، دو تب و اسکرین‌شات، Sites HEAD/tree/مخاطب و بازبینی مستقل **Blocked/UNVERIFIED**. **نسخهٔ زنده تغییر نکرد؛ Released نیست.** قدم بعد: درگاه‌های واقعی تست و تطبیق دو منبع پیش از انتشار.

### 2026-11-18 — ND-024: جلوگیری از بازیابی فایل قدیمی پس از تغییر فضای کار (فقط برنچ)

**In progress / انتشار Blocked.** در نسخهٔ آزمایشی local-first، اگر کاربر در فاصلهٔ انتخاب و پایان خواندن پشتیبان، نود را ویرایش کند، پروژه را عوض کند، بازیابی دیگری شروع شود یا تداخل ذخیره رخ دهد، فایلِ درحال‌خواندن دیگر پنجرهٔ تأیید جایگزینی نشان نمی‌دهد و با پیام فارسی/انگلیسی لغو می‌شود. Import عادی و اولویت انتخاب جدید محفوظ است. کنترل موجود **Import JSON** است؛ کنترل، مدل داده، ذخیره یا انیمیشن تازه اضافه نشده. scope `dc40dc04`، کد/آزمون `feb1855c`، tree `2c30f811`، [QA](ND-024-IMPORT-CONTEXT-QA.md). تست ایزولهٔ native Node22 روی handler تطبیق‌داده‌شده با GitHub **۹/۹** و ۱۰ آزمون ثبت‌شده با V8 façade **۱۰/۱۰** موفق؛ JS/CSP درست. تست بومی کامل پروژه، TypeScript/build، مرورگر واقعی ۴۱۷۳ در FA/EN و موبایل، دو تب IndexedDB، اسکرین‌شات و Sites HEAD/tree **انجام نشدند**؛ نسخهٔ انتشار **هیچ**. گام بعد بازیابی محیط واقعی تست، بازبینی مستقل و تطبیق دو درخت پیش از انتشار است.

### 2026-11-18 01:22 UTC — ND-024 native verification gate (In progress; branch only)

Previous ND-024 fixes are still not part of the live Site. This slice adds a read-only GitHub Actions gate on `fix/nd-024-startup-storage-recovery` to run the *actual checked-in* suite, project TypeScript and production build against the pushed tree (Node 24, locked dependencies). The workflow itself is not a new product capability and does not publish. Until its run is inspected, checks remain **not run**; local browser `127.0.0.1:4173`, screenshots, two-tab IndexedDB, independent review and Site source/audience parity remain **Blocked/UNVERIFIED**. [Scope in log](DEVELOPMENT_LOG.md). Version and deployment **NONE**.

### 2026-11-18 01:27 UTC — ND-024 native gates PASS; release still Blocked

[Native GitHub Actions #44215710119](https://github.com/iAlirezaaa/nodus/actions/runs/44215710119) checked the real branch code tree `3b882634fc18a8541bc95bc1307311e3185a3391` at [`aabb91d055f`](https://github.com/iAlirezaaa/nodus/commit/aabb91d055fad507182c9d9a9125a5c96025a2a1): **313 of 313 checked-in Node tests PASS, TypeScript PASS, production build PASS** on Node 24. The initial [run #44215125992](https://github.com/iAlirezaaa/nodus/actions/runs/44215125992) failed 8 of 313 tests; two outdated test harnesses were repaired without weakening app guards or changing source behavior. CI workflow and QA: [ND-024 native gate](ND-024-NATIVE-CI-QA.md). This is a development/test infrastructure improvement on the feature branch **only**, not a newly released user-facing feature.

**ND-024 remains In progress, not fully Verified or Released.** Real 4173 browser, FA/EN desktop/mobile screenshots, genuine two-tab IndexedDB and actual authenticated accounts, independent review and current Sites source/tree/audience are **Blocked/UNVERIFIED**. No merge, new Site version, deployment ID or screenshot; public visibility reported by GitHub remains unchanged. Next: restore real Nodus browser/Sites access, validate storage/save/reload and reconcile trees before any guarded release. Five product-development axes remain part of roadmap, not newly delivered by this infrastructure slice.
