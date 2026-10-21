import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
export const dynamic = "force-dynamic";

const PERIODS = {
  "1D": { days: 2, interval: "5m" },
  "1W": { days: 8, interval: "1h" },
  "1M": { days: 32, interval: "1d" },
  "3M": { days: 95, interval: "1d" },
  "1Y": { days: 370, interval: "1wk" },
  "5Y": { days: 1835, interval: "1mo" },
};

export async function GET(request) {
  const url = new URL(request.url);
  const ticker = (url.searchParams.get("ticker") || "").trim().toUpperCase();
  const range = url.searchParams.get("range") || "1M";
  if (!/^[A-Z0-9.^=-]{1,20}$/.test(ticker) || !PERIODS[range]) {
    return Response.json({ error: "invalid_parameters" }, { status: 400 });
  }
  const { days, interval } = PERIODS[range];
  try {
    const period1 = new Date(Date.now() - days * 86400000);
    const result = await yahooFinance.chart(ticker, { period1, interval });
    const points = (result.quotes || [])
      .filter((q) => Number.isFinite(q.close) && q.date)
      .map((q) => ({ time: new Date(q.date).getTime(), close: q.close }));
    return Response.json({ points }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    return Response.json({ error: "history_unavailable", points: [] }, { status: 502 });
  }
}
