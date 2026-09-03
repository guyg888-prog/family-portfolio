import { getKey, setKey, EMPTY_STATE } from "@/lib/db";

export const dynamic = "force-dynamic";

const IDS = ["mark", "ron", "guy"];

/* Ron and Guy never receive each other's data. The filtering happens here,
   on the server, so a brother's browser never holds the other's numbers. */
function scope(data, who) {
  if (who === "mark") return data;
  return {
    positions: { mark: [], ron: [], guy: [], [who]: data.positions?.[who] || [] },
    cash: { mark: "", ron: "", guy: "", [who]: data.cash?.[who] ?? "" },
    deposits: { mark: "", ron: "", guy: "", [who]: data.deposits?.[who] ?? "" },
    realized: { mark: "", ron: "", guy: "", [who]: data.realized?.[who] ?? "" },
  };
}

function scopeHistory(history, who) {
  if (who === "mark") return history;
  return (history || []).map((p) => ({ d: p.d, [who]: p[who] ?? 0 }));
}

export async function GET(req) {
  try {
    const who = new URL(req.url).searchParams.get("me");
    const [data, history] = await Promise.all([
      getKey("state", EMPTY_STATE),
      getKey("history", []),
    ]);
    if (!IDS.includes(who)) return Response.json({ data: EMPTY_STATE, history: [] });
    return Response.json({
      data: scope({ ...EMPTY_STATE, ...data }, who),
      history: scopeHistory(history, who),
    });
  } catch (e) {
    return Response.json({ error: "db_unavailable" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const who = body.me;
    if (!IDS.includes(who)) return Response.json({ error: "unknown" }, { status: 403 });

    const current = { ...EMPTY_STATE, ...(await getKey("state", EMPTY_STATE)) };

    if (body.data) {
      let next;
      if (who === "mark") {
        next = body.data;
      } else {
        /* a brother may only touch his own slice, and may not write calls —
           those stay Mark's. Existing calls are restored by position id. */
        const previous = current.positions[who] || [];
        const incoming = body.data.positions?.[who] || [];
        const keptCalls = Object.fromEntries(previous.map((p) => [p.id, p.call || null]));
        next = {
          positions: {
            ...current.positions,
            [who]: incoming.map((p) => ({ ...p, call: keptCalls[p.id] ?? null })),
          },
          cash: { ...current.cash, [who]: body.data.cash?.[who] ?? current.cash[who] },
          deposits: {
            ...current.deposits,
            [who]: body.data.deposits?.[who] ?? current.deposits[who],
          },
          realized: {
            ...(current.realized || {}),
            [who]: body.data.realized?.[who] ?? (current.realized || {})[who] ?? "",
          },
        };
      }
      await setKey("state", next);
    }

    if (body.historyPoint && body.historyPoint.d) {
      const history = (await getKey("history", [])) || [];
      const existing = history.find((p) => p.d === body.historyPoint.d) || {};
      const merged =
        who === "mark"
          ? { ...existing, ...body.historyPoint }
          : { ...existing, d: body.historyPoint.d, [who]: body.historyPoint[who] };
      const next = [...history.filter((p) => p.d !== merged.d), merged]
        .sort((a, b) => a.d.localeCompare(b.d))
        .slice(-400);
      await setKey("history", next);
    }

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "save_failed" }, { status: 500 });
  }
}
