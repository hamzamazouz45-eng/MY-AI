// Self-contained strings for the browser feature (Arabic + English), so the
// app-wide locale files and their parity tests stay untouched.

export interface BrowserStrings {
  title: string;
  newTab: string;
  addressPlaceholder: string;
  blankHint: string;
  assistant: string;
  close: string;
  clear: string;
  send: string;
  stop: string;
  inputPlaceholder: string;
  usePage: string;
  emptyHint: string;
  noModel: string;
  busy: string;
  error: string;
  contextFull: string;
  webSearch: string;
  searching: string;
  reading: string;
  noResults: string;
  sources: string;
  chips: {label: string; prompt: string}[];
}

const en: BrowserStrings = {
  title: 'Browser',
  newTab: 'New tab',
  addressPlaceholder: 'Search or enter address',
  blankHint: 'Type an address above, or tap the sparkle for the assistant.',
  assistant: 'Assistant',
  close: 'Close',
  clear: 'Clear chat',
  send: 'Send',
  stop: 'Stop',
  inputPlaceholder: 'Ask about this page...',
  usePage: 'Use the current page as context',
  emptyHint:
    'Ask about the open page, or ask for a summary or translation. The model runs on your phone.',
  noModel: 'No model is loaded. Open Models, download one and load it first.',
  busy: 'The model is busy with another request. Try again in a moment.',
  error: 'Something went wrong:',
  contextFull:
    'This page is too long for the model context window. Open Models, increase the model context size in its settings (4096 or more), reload the model, then try again.',
  webSearch: 'Search the web (sends your question to DuckDuckGo)',
  searching: 'Searching the web...',
  reading: 'Reading the top results...',
  noResults:
    'No search results. The search page may have changed or blocked the request. Try again, or open a search in a tab and use "current page as context".',
  sources: 'Sources',
  chips: [
    {
      label: 'Summarize',
      prompt: 'Summarize this page in clear, concise bullet points.',
    },
    {
      label: 'Key points',
      prompt: 'List the most important points, numbers and names on this page.',
    },
    {
      label: 'Translate to Arabic',
      prompt:
        'Translate the text I selected on the page to Arabic. If nothing is selected, translate the main content of the page.',
    },
    {
      label: 'Explain selection',
      prompt: 'Explain the text I selected on the page in simple terms.',
    },
  ],
};

const ar: BrowserStrings = {
  title: 'المتصفح',
  newTab: 'علامة تبويب جديدة',
  addressPlaceholder: 'ابحث أو اكتب عنواناً',
  blankHint: 'اكتب عنواناً في الأعلى، أو اضغط ✦ لفتح المساعد.',
  assistant: 'المساعد',
  close: 'إغلاق',
  clear: 'مسح المحادثة',
  send: 'إرسال',
  stop: 'إيقاف',
  inputPlaceholder: 'اسأل عن هذه الصفحة...',
  usePage: 'استخدام الصفحة الحالية كسياق',
  emptyHint:
    'اسأل عن الصفحة المفتوحة، أو اطلب تلخيصاً أو ترجمة. النموذج يعمل على هاتفك.',
  noModel: 'لا يوجد نموذج محمّل. افتح «Models» ونزّل نموذجاً ثم حمّله أولاً.',
  busy: 'النموذج مشغول بطلب آخر. حاول بعد قليل.',
  error: 'حدث خطأ:',
  contextFull:
    'الصفحة أطول مما تتسع له نافذة سياق النموذج. افتح «Models» وارفع حجم السياق (Context size) في إعدادات النموذج إلى 4096 أو أكثر، ثم أعد تحميل النموذج وجرّب مجدداً.',
  webSearch: 'البحث في الإنترنت (يرسل سؤالك إلى DuckDuckGo)',
  searching: 'جاري البحث في الإنترنت...',
  reading: 'جاري قراءة أهم النتائج...',
  noResults:
    'لا توجد نتائج بحث. قد تكون صفحة البحث تغيّرت أو حجبت الطلب. حاول مجدداً، أو افتح البحث في تبويب واستخدم «الصفحة الحالية كسياق».',
  sources: 'المصادر',
  chips: [
    {label: 'تلخيص الصفحة', prompt: 'لخّص هذه الصفحة في نقاط واضحة ومختصرة.'},
    {
      label: 'أهم النقاط',
      prompt: 'استخرج أهم النقاط والأرقام والأسماء المذكورة في هذه الصفحة.',
    },
    {
      label: 'ترجمة إلى العربية',
      prompt:
        'ترجم إلى العربية النص الذي حددته في الصفحة إن وُجد، وإلا ترجم المحتوى الرئيسي للصفحة.',
    },
    {
      label: 'شرح المحدد',
      prompt: 'اشرح لي بشكل مبسّط النص الذي حددته في الصفحة.',
    },
  ],
};

export const getBrowserStrings = (language: string): BrowserStrings =>
  language === 'ar' ? ar : en;
