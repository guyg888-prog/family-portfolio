import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { tickers } = await req.json();
    if (!Array.isArray(tickers) || tickers.length === 0) return Response.json({});

    const clean = [...new Set(tickers.map((t) => String(t).toUpperCase().trim()))].slice(0, 60);

    const results = await Promise.allSettled(
      clean.map((t) => yahooFinance.quote(t))
    );

    const out = {};
    results.forEach((r, i) => {
      if (r.status !== "fulfilled" || !r.value) return;
      const q = Array.isArray(r.value) ? r.value[0] : r.value;
      if (!q || typeof q.regularMarketPrice !== "number") return;
      out[clean[i]] = {
        price: q.regularMarketPrice,
        change: q.regularMarketChangePercent ?? 0,
        currency: q.currency || "USD",
        name: q.shortName || q.longName || null,
      };
    });

    return Response.json(out);
  } catch (e) {
    return Response.json({ error: "quotes_failed" }, { status: 500 });
  }
}
