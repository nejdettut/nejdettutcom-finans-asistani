import "server-only";
import { generateObject } from "ai";
import { groq } from "@ai-sdk/groq";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestSchema = z.object({
  expensesText: z.string().min(10).max(4000),
  monthlyIncome: z.number().int().min(0).max(1_000_000).optional(),
  currency: z.enum(["TRY", "USD", "EUR"]).default("TRY"),
});

const ExpenseCategory = z.enum([
  "kira",
  "faturalar",
  "market",
  "yemek-disarida",
  "ulasim",
  "abonelik",
  "saglik",
  "egitim",
  "eglence",
  "giyim",
  "kisisel-bakim",
  "borc-odemesi",
  "tasarruf-yatirim",
  "diger",
]);

const AnalysisSchema = z.object({
  expenses: z
    .array(
      z.object({
        description: z.string(),
        category: ExpenseCategory,
        amount: z.number(),
        isRecurring: z.boolean(),
      }),
    )
    .min(1)
    .max(60),
  totals: z.object({
    total: z.number(),
    byCategory: z
      .array(
        z.object({
          category: ExpenseCategory,
          amount: z.number(),
          percent: z.number().int().min(0).max(100),
        }),
      )
      .min(1),
  }),
  budgetScore: z.object({
    score: z.number().int().min(0).max(100),
    verdict: z.enum(["kritik", "zayif", "idare-eder", "iyi", "mukemmel"]),
    summary: z.string(),
  }),
  risks: z
    .array(
      z.object({
        category: ExpenseCategory,
        note: z.string(),
        severity: z.enum(["dusuk", "orta", "yuksek"]),
      }),
    )
    .max(8),
  tips: z
    .array(
      z.object({
        title: z.string(),
        detail: z.string(),
        estimatedMonthlySaving: z.number().optional(),
      }),
    )
    .min(3)
    .max(7),
});

const CATEGORY_LABEL: Record<z.infer<typeof ExpenseCategory>, string> = {
  kira: "Kira",
  faturalar: "Faturalar",
  market: "Market",
  "yemek-disarida": "Dışarıda yemek",
  ulasim: "Ulaşım",
  abonelik: "Abonelikler",
  saglik: "Sağlık",
  egitim: "Eğitim",
  eglence: "Eğlence",
  giyim: "Giyim",
  "kisisel-bakim": "Kişisel bakım",
  "borc-odemesi": "Borç ödemesi",
  "tasarruf-yatirim": "Tasarruf/Yatırım",
  diger: "Diğer",
};

export async function POST(req: Request) {
  const limited = await rateLimit({
    action: "finans-analiz",
    windowMs: 60 * 60 * 1000,
    max: 15,
  });
  if (!limited.ok) {
    return json(
      {
        error:
          "Saatte en fazla 15 analiz üretebilirsin. Lütfen biraz sonra tekrar dene.",
      },
      429,
    );
  }

  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await req.json());
  } catch {
    return json({ error: "Geçersiz istek gövdesi." }, 400);
  }

  const incomeNote =
    typeof body.monthlyIncome === "number" && body.monthlyIncome > 0
      ? `Kullanıcının bildirdiği aylık net gelir: ${body.monthlyIncome} ${body.currency}. Bütçe skorunu bu gelire göre hesapla; harcamaların gelire oranı %60 altıysa iyi, %60-80 arası idare-eder, %80-100 arası zayıf, %100 üstü kritik.`
      : "Kullanıcı gelir vermedi. Bütçe skorunu harcama dengesine ve risk sinyallerine göre tahminle oluştur.";

  const system = [
    "Sen Türkiye koşullarını bilen deneyimli bir kişisel finans koçusun.",
    "Kullanıcı, bir aylık harcamalarını serbest metin olarak yazar; tutarlar TL, USD veya EUR cinsinden olabilir.",
    "Senin görevin: (1) her harcamayı tek tek ayıkla, (2) kategorilerden birine yerleştir, (3) tekrarlayan (sabit) mi değişken mi ayır, (4) toplam ve kategori dağılımını hesapla, (5) 0-100 arası bütçe skoru ver, (6) risk sinyallerini listele (örn. abonelik şişkinliği, dışarıda yeme ağırlığı, tasarruf yok), (7) 3-7 somut, gerekçeli tasarruf önerisi üret.",
    "Kategoriler sabit listedir: kira, faturalar, market, yemek-disarida, ulasim, abonelik, saglik, egitim, eglence, giyim, kisisel-bakim, borc-odemesi, tasarruf-yatirim, diger.",
    "Yüzdelik değerler 0-100 arası tam sayı olsun, tüm kategoriler toplamı 100±2'de kalsın (yuvarlama kabul).",
    "Her tavsiye uygulanabilir (somut) olsun; 'daha az harca' gibi genel ifadelerden kaçın.",
    "Tüm metin Türkçe. Yatırım/finansal tavsiye vermiyorsun; 'önerilir', 'olabilir', 'tahmini' gibi ifadeler kullan.",
    `Para birimi: ${body.currency}. Tutarları bu birim içinde tut.`,
    incomeNote,
  ].join(" ");

  const prompt = `Kullanıcının bu ayki harcamaları (serbest metin):\n\n${body.expensesText}\n\nTüm analizi JSON şemasına uygun döndür. Expenses dizisindeki her kalem gerçek harcamayı temsil eder; soyut kategoriler değil.`;

  try {
    const { object } = await generateObject({
      model: groq("openai/gpt-oss-120b"),
      schema: AnalysisSchema,
      system,
      prompt,
      temperature: 0.3,
    });
    return json({ ...object, categoryLabels: CATEGORY_LABEL });
  } catch (err) {
    console.error("[finans] failed:", err);
    return json(
      { error: "Analiz üretilemedi. Lütfen biraz sonra tekrar dene." },
      502,
    );
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
