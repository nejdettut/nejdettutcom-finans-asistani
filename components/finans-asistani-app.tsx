"use client";

import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Loader2,
  PiggyBank,
  Receipt,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Currency = "TRY" | "USD" | "EUR";

type Category =
  | "kira"
  | "faturalar"
  | "market"
  | "yemek-disarida"
  | "ulasim"
  | "abonelik"
  | "saglik"
  | "egitim"
  | "eglence"
  | "giyim"
  | "kisisel-bakim"
  | "borc-odemesi"
  | "tasarruf-yatirim"
  | "diger";

type Expense = {
  description: string;
  category: Category;
  amount: number;
  isRecurring: boolean;
};

type AnalysisResult = {
  expenses: Expense[];
  totals: {
    total: number;
    byCategory: { category: Category; amount: number; percent: number }[];
  };
  budgetScore: {
    score: number;
    verdict: "kritik" | "zayif" | "idare-eder" | "iyi" | "mukemmel";
    summary: string;
  };
  risks: {
    category: Category;
    note: string;
    severity: "dusuk" | "orta" | "yuksek";
  }[];
  tips: {
    title: string;
    detail: string;
    estimatedMonthlySaving?: number;
  }[];
  categoryLabels: Record<Category, string>;
};

const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: "TRY", label: "Türk Lirası", symbol: "₺" },
  { value: "USD", label: "ABD Doları", symbol: "$" },
  { value: "EUR", label: "Euro", symbol: "€" },
];

const EXAMPLES: Array<{ label: string; text: string }> = [
  {
    label: "Aile · 3 kişi",
    text: `Bu ay harcamalarım:
- Kira 18.000 TL
- Elektrik 650, su 220, doğalgaz 480, internet 390
- Market: Hafta sonu BİM-Migros toplam 7.800 civarı (3 hafta)
- Dışarıda yemek: Hafta içi öğle 2x sipariş ortalama 180, hafta sonu 1 restoran ~900 TL (4 kez)
- Ulaşım: metro kart 450, bir gün Uber 320
- Netflix 149, Spotify 89, YouTube Premium 89, bir fitness app 59
- Eczane 420, bir kontrol muayenesi 1200
- Çocuğun kırtasiye + okul kitap 1800
- Giyim: 2 pantolon toplam 2400
- Kuaför 350
- Kredi kartı asgari 1500
- Bu ay tasarruf hesabına 0 attım`,
  },
  {
    label: "Öğrenci · burslu",
    text: `Burs + yarım-zamanlı iş toplam gelir:
- Yurt yemek + ulaşım kartı 2.800
- Kitap + fotokopi 450
- Kafeter 10x180 = 1800
- Giyim/ayakkabı 1200
- Telefon faturası 200
- Spor salonu 650
- Film/konser 400
- 2 kez Trendyol siparişi 900
- Ailemden harçlık geldi 1500 ama bu ay hiç bir şey biriktiremedim`,
  },
  {
    label: "Serbest · tasarruf",
    text: `Bu ay freelancer kazancım 42.000 TL net.
Sabit gider:
- Kira 11.000
- Fatura toplamı 1.400
- Ofis + telefon 900
- Sağlık sigortası 1.800
Değişken:
- Market 5.200
- Restoran 2.300
- Benzin 2.100
- Netflix + Spotify 240
- Spor 850
- 2 online kurs aboneliği 1600
Bu ay 6.000 TL yatırım hesabına attım, tasarrufum iyi gidiyor sanki.`,
  },
];

const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-navy/90 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-emerald dark:text-brand-navy";

const BTN_OUTLINE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white/70 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm backdrop-blur transition hover:bg-slate-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:bg-slate-900";

const CARD =
  "rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60";

const MUTED_TEXT = "text-slate-500 dark:text-slate-400";

const VERDICT_STYLE: Record<
  AnalysisResult["budgetScore"]["verdict"],
  { label: string; color: string; bar: string }
> = {
  kritik: {
    label: "Kritik",
    color: "text-rose-600 dark:text-rose-400",
    bar: "bg-rose-500",
  },
  zayif: {
    label: "Zayıf",
    color: "text-orange-600 dark:text-orange-400",
    bar: "bg-orange-500",
  },
  "idare-eder": {
    label: "İdare eder",
    color: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  iyi: {
    label: "İyi",
    color: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  mukemmel: {
    label: "Mükemmel",
    color: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-600",
  },
};

const SEVERITY_STYLE: Record<
  AnalysisResult["risks"][number]["severity"],
  string
> = {
  dusuk: "border-amber-400/40 bg-amber-400/10 text-amber-900 dark:text-amber-200",
  orta: "border-orange-400/40 bg-orange-400/10 text-orange-900 dark:text-orange-200",
  yuksek: "border-rose-400/40 bg-rose-400/10 text-rose-900 dark:text-rose-200",
};

function formatAmount(amount: number, currency: Currency): string {
  const symbol =
    CURRENCIES.find((c) => c.value === currency)?.symbol ?? currency;
  return `${symbol}${amount.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`;
}

export function FinansAsistaniApp() {
  const [expensesText, setExpensesText] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState<string>("");
  const [currency, setCurrency] = useState<Currency>("TRY");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function run() {
    if (expensesText.trim().length < 10) {
      setError("En az 10 karakter uzunluğunda harcama metni gir.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    const payload: Record<string, unknown> = {
      expensesText,
      currency,
    };
    const income = Number.parseInt(monthlyIncome, 10);
    if (!Number.isNaN(income) && income > 0) payload.monthlyIncome = income;

    try {
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) setError(data.error ?? "Bilinmeyen hata.");
      else setResult(data as AnalysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ağ hatası.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Input column */}
      <div className="space-y-4 lg:col-span-2">
        <div className={CARD}>
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Receipt className="size-4 text-brand-emerald" />
              Bu ayki harcamalarını yaz
            </h2>
          </div>
          <div className="space-y-4 p-5">
            <textarea
              value={expensesText}
              onChange={(e) => setExpensesText(e.target.value)}
              placeholder="Örnek: Kira 18.000, Market 8.000, Netflix 149, Dışarıda yemek 3600, Ulaşım 770…"
              className="block h-56 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm leading-relaxed text-slate-900 shadow-inner outline-none focus:border-brand-emerald focus:ring-2 focus:ring-brand-emerald/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={cn("mb-1.5 block text-xs font-semibold uppercase tracking-wider", MUTED_TEXT)}>
                  Para birimi
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.symbol} {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={cn("mb-1.5 block text-xs font-semibold uppercase tracking-wider", MUTED_TEXT)}>
                  Aylık net gelir (opsiyonel)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  placeholder="örn: 50000"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={run}
                disabled={loading || expensesText.trim().length < 10}
                className={BTN_PRIMARY}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Analiz üretiliyor…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" />
                    Bütçemi analiz et
                  </>
                )}
              </button>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => setExpensesText(ex.text)}
                  disabled={loading}
                  className={BTN_OUTLINE}
                >
                  {ex.label}
                </button>
              ))}
            </div>

            <p className={cn("text-[11px]", MUTED_TEXT)}>
              Saatte 15 analiz sınırı. Metin maksimum 4.000 karakter. Gelir
              bilgisi isteğe bağlıdır; verirsen skor daha gerçekçi olur.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
          <strong>Bilgilendirme:</strong> Bu araç eğitim amaçlıdır; yatırım veya
          finansal danışmanlık yerine geçmez.
        </div>
      </div>

      {/* Output column */}
      <div className="space-y-4 lg:col-span-3">
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {!result && !loading && !error ? (
          <div
            className={cn(
              CARD,
              "flex flex-col items-center gap-3 border-dashed py-14 text-center",
            )}
          >
            <PiggyBank className="size-10 text-brand-emerald" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Harcamalarını yaz, bütçe skorunu al
            </h3>
            <p className={cn("max-w-sm text-sm", MUTED_TEXT)}>
              Bir aylık harcamalarını serbestçe yaz, &quot;Bütçemi analiz
              et&quot;e bas. Kategori dağılımı, 0-100 skor, risk sinyalleri ve
              tasarruf önerileri bu sütunda belirir.
            </p>
          </div>
        ) : null}

        {loading ? (
          <div
            className={cn(
              CARD,
              "flex flex-col items-center gap-3 py-14 text-center",
            )}
          >
            <Loader2 className="size-10 animate-spin text-brand-emerald" />
            <p className={cn("text-sm", MUTED_TEXT)}>
              Analiz hazırlanıyor… 15-30 saniye.
            </p>
          </div>
        ) : null}

        {result ? (
          <>
            {/* Budget score */}
            <div className={cn(CARD, "px-5 py-5")}>
              <p className={cn("text-[11px] font-semibold uppercase tracking-wider", MUTED_TEXT)}>
                Bütçe Skorun
              </p>
              <div className="mt-2 flex items-baseline gap-3">
                <span
                  className={cn(
                    "text-4xl font-bold tracking-tight",
                    VERDICT_STYLE[result.budgetScore.verdict].color,
                  )}
                >
                  {result.budgetScore.score}
                </span>
                <span className={cn("text-xs font-semibold uppercase tracking-wider", VERDICT_STYLE[result.budgetScore.verdict].color)}>
                  {VERDICT_STYLE[result.budgetScore.verdict].label}
                </span>
                <span className={cn("ml-auto text-xs", MUTED_TEXT)}>
                  Toplam harcama: {formatAmount(result.totals.total, currency)}
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className={cn(
                    "h-full transition-all",
                    VERDICT_STYLE[result.budgetScore.verdict].bar,
                  )}
                  style={{ width: `${result.budgetScore.score}%` }}
                />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {result.budgetScore.summary}
              </p>
            </div>

            {/* Category breakdown */}
            <div className={cn(CARD, "px-5 py-5")}>
              <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                Kategori dağılımı
              </h3>
              <ul className="space-y-2">
                {result.totals.byCategory.map((row, i) => (
                  <li key={i}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {result.categoryLabels[row.category] ?? row.category}
                      </span>
                      <span className={MUTED_TEXT}>
                        {formatAmount(row.amount, currency)} · {row.percent}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full bg-brand-emerald"
                        style={{ width: `${Math.min(100, row.percent)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Expenses */}
            <div className={cn(CARD, "px-5 py-5")}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Wallet className="size-4 text-brand-emerald" />
                Ayıklanan harcamalar ({result.expenses.length})
              </h3>
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {result.expenses.map((e, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-slate-900 dark:text-slate-100">
                        <span className="font-medium">{e.description}</span>
                      </p>
                      <p className={cn("text-xs", MUTED_TEXT)}>
                        {result.categoryLabels[e.category] ?? e.category}
                        {e.isRecurring ? " · Sabit gider" : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-slate-900 dark:text-slate-100">
                      {formatAmount(e.amount, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Risks */}
            {result.risks.length > 0 ? (
              <div className={cn(CARD, "px-5 py-5")}>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <AlertTriangle className="size-4 text-amber-500" />
                  Risk sinyalleri
                </h3>
                <ul className="space-y-2">
                  {result.risks.map((risk, i) => (
                    <li
                      key={i}
                      className={cn(
                        "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
                        SEVERITY_STYLE[risk.severity],
                      )}
                    >
                      <TrendingUp className="mt-0.5 size-3.5 shrink-0" />
                      <div>
                        <p className="font-semibold">
                          {result.categoryLabels[risk.category] ?? risk.category}
                          <span className="ml-2 text-[10px] font-normal uppercase tracking-wider opacity-70">
                            {risk.severity === "yuksek"
                              ? "Yüksek"
                              : risk.severity === "orta"
                                ? "Orta"
                                : "Düşük"}
                          </span>
                        </p>
                        <p className="mt-0.5">{risk.note}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Tips */}
            <div className={cn(CARD, "px-5 py-5")}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <TrendingDown className="size-4 text-brand-emerald" />
                Tasarruf önerileri
              </h3>
              <ul className="space-y-3">
                {result.tips.map((tip, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {tip.title}
                      </p>
                      {typeof tip.estimatedMonthlySaving === "number" ? (
                        <span className="shrink-0 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                          ~{formatAmount(tip.estimatedMonthlySaving, currency)}/ay
                        </span>
                      ) : null}
                    </div>
                    <p className={cn("mt-1 text-xs leading-relaxed", MUTED_TEXT)}>
                      {tip.detail}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
