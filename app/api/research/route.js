import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CONSENSUS = {
  strong_buy: "Strong Buy",
  buy: "Buy",
  hold: "Hold",
  underperform: "Sell",
  sell: "Sell",
  strong_sell: "Strong Sell",
};

export async function POST(req) {
  const { ticker } = await req.json().catch(() => ({}));
  if (!ticker) return Response.json({ error: "no_ticker" }, { status: 400 });
  const sym = String(ticker).toUpperCase().trim();

  /* 1. hard numbers straight from the source */
  let facts = {};
  try {
    const s = await yahooFinance.quoteSummary(sym, {
      modules: ["price", "summaryDetail", "financialData", "defaultKeyStatistics"],
    });
    facts = {
      company: s.price?.longName || s.price?.shortName || sym,
      price: s.price?.regularMarketPrice ?? null,
      consensus: CONSENSUS[s.financialData?.recommendationKey] || null,
      analysts: s.financialData?.numberOfAnalystOpinions ?? null,
      target: s.financialData?.targetMeanPrice ?? null,
      targetLow: s.financialData?.targetLowPrice ?? null,
      targetHigh: s.financialData?.targetHighPrice ?? null,
      low52: s.summaryDetail?.fiftyTwoWeekLow ?? null,
      high52: s.summaryDetail?.fiftyTwoWeekHigh ?? null,
      pe: s.summaryDetail?.trailingPE ?? null,
      forwardPe: s.summaryDetail?.forwardPE ?? null,
      marketCap: s.price?.marketCap ?? null,
      margins: s.financialData?.profitMargins ?? null,
      revenueGrowth: s.financialData?.revenueGrowth ?? null,
    };
  } catch (e) {
    return Response.json({ error: "lookup_failed" }, { status: 502 });
  }

  /* 2. let Claude read those numbers and say what they mean */
  let points = [];
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 900,
          messages: [
            {
              role: "user",
              content:
                `These are current figures for ${sym} (${facts.company}):\n` +
                JSON.stringify(facts, null, 1) +
                `\n\nSearch for the most significant recent news on this company, then respond with ONLY a JSON array of exactly 3 strings, no prose, no markdown fences.\n` +
                `Each string is one short sentence IN HEBREW describing what is driving the stock right now — combine the figures above with what you find. State facts and figures. Do not give buy or sell instructions.`,
            },
          ],
          tools: [{ type: "web_search_20250305", name: "web_search" }],
        }),
      });
      const json = await res.json();
      const text = (json.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      const a = text.indexOf("[");
      const b = text.lastIndexOf("]");
      if (a !== -1 && b !== -1) {
        const parsed = JSON.parse(text.slice(a, b + 1));
        if (Array.isArray(parsed)) points = parsed.filter((p) => typeof p === "string");
      }
    } catch (e) {
      /* numbers alone are still useful */
    }
  }

  return Response.json({ ...facts, points });
}
