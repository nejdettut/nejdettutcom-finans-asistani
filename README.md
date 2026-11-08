# AI Finans Asistanı — nejdettut.com

Serbest metin olarak yazılan harcama kalemlerini yapay zekâ ile ayıklayan,
kategorize eden, bütçe skoru hesaplayan ve gerekçeli tasarruf önerileri
üreten tek-sayfalık asistan.

- **Mimari:** Next.js 16 App Router + Tailwind CSS v4 + Vercel AI SDK + Groq
- **Model:** `openai/gpt-oss-120b` (Groq)
- **Çıktı:** Tek `generateObject` çağrısı; Zod şemalı JSON
- **Güvenlik:** `GROQ_API_KEY` sadece sunucu tarafında; `@/lib/rate-limit`
  saatte 15 analiz/IP
- **Para birimi:** TRY (varsayılan) / USD / EUR

Bu uygulama [nejdettut.com](https://www.nejdettut.com) yapay zekâ projeleri
koleksiyonunun bir parçasıdır. Eğitim amaçlıdır; yatırım veya finansal
danışmanlık yerine geçmez.

## Geliştirme

```bash
npm install
cp .env.example .env.local   # GROQ_API_KEY ekleyin
npm run dev
```

Lokalde `http://localhost:3000` adresinde açılır.

## Deploy

Vercel. `GROQ_API_KEY` environment variable olarak eklenmelidir.
