import { getKey, setKey, EMPTY_STATE } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [data, history] = await Promise.all([
      getKey("state", EMPTY_STATE),
      getKey("history", []),
    ]);
    return Response.json({ data, history });
  } catch (e) {
    return Response.json({ error: "db_unavailable" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();

    if (body.data) await setKey("state", body.data);

    if (body.historyPoint && body.historyPoint.d) {
      const history = (await getKey("history", [])) || [];
      const next = [
        ...history.filter((p) => p.d !== body.historyPoint.d),
        body.historyPoint,
      ]
        .sort((a, b) => a.d.localeCompare(b.d))
        .slice(-400);
      await setKey("history", next);
    }

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "save_failed" }, { status: 500 });
  }
}
