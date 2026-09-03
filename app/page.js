"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { RefreshCw, Pencil, Check, Plus, Trash2, Sparkles, X } from "lucide-react";

/* ------------------------------------------------------------------ */
/* constants                                                           */
/* ------------------------------------------------------------------ */

const OWNERS = [
  { id: "mark", label: "MARK", he: "מארק", color: "#7AA2F7" },
  { id: "ron", label: "RON", he: "רון", color: "#35C989" },
  { id: "guy", label: "GUY", he: "גיא", color: "#C4A7F7" },
];

const CALLS = [
  { id: "buy", he: "להגדיל" },
  { id: "hold", he: "להחזיק" },
  { id: "trim", he: "לצמצם" },
  { id: "sell", he: "למכור" },
];

const EMPTY = {
  positions: { mark: [], ron: [], guy: [] },
  cash: { mark: "", ron: "", guy: "" },
  deposits: { mark: "", ron: "", guy: "" },
};

const usd = (n, d = 2) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: d,
  }).format(n || 0);

const usdShort = (n) =>
  Math.abs(n) >= 1000 ? "$" + (n / 1000).toFixed(1) + "k" : "$" + Math.round(n);

const pct = (n) => (n > 0 ? "+" : "") + (n || 0).toFixed(1) + "%";
const toNum = (v) => Number(String(v).replace(/[^\d.-]/g, "")) || 0;
const uid = () => Math.random().toString(36).slice(2, 9);
const isoDay = () => new Date().toISOString().slice(0, 10);
const dayLabel = (iso) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
const tone = (n) => (n > 0 ? "up" : n < 0 ? "down" : "flat");
const ownerOf = (id) => OWNERS.find((o) => o.id === id);

/* ------------------------------------------------------------------ */
/* presentational pieces — defined here, never inside the page         */
/* ------------------------------------------------------------------ */

function CapitalStats({ b }) {
  return (
    <div className="stats">
      <div className="stat">
        <span>הופקד</span>
        <b dir="ltr">{b.deposits ? usd(b.deposits, 0) : "—"}</b>
      </div>
      <div className="stat">
        <span>מושקע</span>
        <b dir="ltr">{usd(b.held, 0)}</b>
      </div>
      <div className="stat">
        <span>פנוי</span>
        <b dir="ltr" style={{ color: "var(--cash)" }}>
          {usd(b.cash, 0)}
        </b>
      </div>
    </div>
  );
}

function MoneyEditor({ data, owners, onChange }) {
  if (owners.length === 0) return null;
  return (
    <div className="card">
      <div className="ttl">כסף בתיק</div>
      {owners.map((o) => (
        <div key={o.id} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: o.color }} />
            <span className="name">{o.label}</span>
          </div>
          <div className="g2">
            <div>
              <span className="lbl">סה״כ הופקד</span>
              <input
                className="inp"
                dir="ltr"
                inputMode="decimal"
                placeholder="0"
                value={data.deposits[o.id] ?? ""}
                onChange={(e) => onChange("deposits", o.id, e.target.value)}
              />
            </div>
            <div>
              <span className="lbl">פנוי להשקעה</span>
              <input
                className="inp"
                dir="ltr"
                inputMode="decimal"
                placeholder="0"
                value={data.cash[o.id] ?? ""}
                onChange={(e) => onChange("cash", o.id, e.target.value)}
              />
            </div>
          </div>
        </div>
      ))}
      <div className="hint">
        ״הופקד״ הוא כל הכסף שהוכנס לתיק לאורך הדרך. התשואה נמדדת מולו, כך שהיא כוללת גם רווחים
        ממניות שכבר נמכרו.
      </div>
    </div>
  );
}

function CallEditor({ init, onSave, onClear, onCancel }) {
  const [action, setAction] = useState(init?.action || "hold");
  const [note, setNote] = useState(init?.note || "");
  return (
    <div style={{ marginTop: 13, paddingTop: 13, borderTop: "1px solid var(--line)" }}>
      <span className="lbl">ההוראה</span>
      <div className="chips">
        {CALLS.map((c) => (
          <button
            key={c.id}
            className="chip"
            data-on={action === c.id ? 1 : 0}
            onClick={() => setAction(c.id)}
          >
            {c.he}
          </button>
        ))}
      </div>
      <span className="lbl">נימוק לאחים</span>
      <input
        className="inp"
        placeholder="שורה אחת שמסבירה למה"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div style={{ display: "flex", gap: 7, marginTop: 12, flexWrap: "wrap" }}>
        <button className="btn pri sm" onClick={() => onSave(action, note)}>
          פרסום
        </button>
        <button className="btn sm" onClick={onCancel}>
          ביטול
        </button>
        {init && (
          <button className="btn sm dg" onClick={onClear}>
            הסרת הוראה
          </button>
        )}
      </div>
    </div>
  );
}

function ResearchBlock({ ticker, price, entry, onRun, onClose }) {
  if (!entry)
    return (
      <button className="btn sm" style={{ marginTop: 12, width: "100%" }} onClick={onRun}>
        <Sparkles size={14} /> ניתוח
      </button>
    );

  if (entry.loading)
    return (
      <div className="rs" style={{ fontSize: 12.5, color: "var(--mut)" }}>
        אוסף נתונים על {ticker}…
      </div>
    );

  if (entry.error)
    return (
      <div className="rs" style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontSize: 12.5, color: "var(--down)" }}>הניתוח נכשל.</span>
        <button className="btn sm" onClick={onRun}>
          נסו שוב
        </button>
      </div>
    );

  const d = entry.data || {};
  const now = price ?? d.price;
  const gap = d.target && now ? ((d.target - now) / now) * 100 : null;
  const span = d.high52 && d.low52 ? d.high52 - d.low52 : null;
  const pos = span && now ? Math.min(99, Math.max(1, ((now - d.low52) / span) * 100)) : null;

  return (
    <div className="rs">
      <div className="rshead">
        <span style={{ fontSize: 12, color: "var(--mut)" }}>
          {d.company || ticker} · נבדק {entry.at}
        </span>
        <button
          className="iconbtn"
          style={{ width: 30, height: 30, borderRadius: 9 }}
          onClick={onClose}
          aria-label="סגירה"
        >
          <X size={14} />
        </button>
      </div>

      <div className="rsgrid">
        <div className="rsg">
          <span>המלצת אנליסטים</span>
          <b>
            {d.consensus || "—"}
            {d.analysts ? (
              <small style={{ color: "var(--mut)", fontWeight: 400 }}> ({d.analysts})</small>
            ) : null}
          </b>
        </div>
        <div className="rsg">
          <span>יעד מחיר ממוצע</span>
          <b dir="ltr">
            {d.target ? usd(d.target) : "—"}
            {gap !== null && (
              <small className={tone(gap)} style={{ fontWeight: 500 }}>
                {" "}
                {pct(gap)}
              </small>
            )}
          </b>
        </div>
        <div className="rsg">
          <span>מכפיל רווח</span>
          <b dir="ltr">{d.pe ? d.pe.toFixed(1) : "—"}</b>
        </div>
        <div className="rsg">
          <span>מחיר נוכחי</span>
          <b dir="ltr">{now ? usd(now) : "—"}</b>
        </div>
      </div>

      {pos !== null && (
        <div>
          <span style={{ fontSize: 10.5, color: "var(--mut)" }}>טווח 52 שבועות</span>
          <div className="rng" dir="ltr">
            <i style={{ left: pos + "%" }} />
          </div>
          <div className="rngl" dir="ltr">
            <span>{usd(d.low52, 0)}</span>
            <span>{usd(d.high52, 0)}</span>
          </div>
        </div>
      )}

      {Array.isArray(d.points) && d.points.length > 0 && (
        <ul className="pts">
          {d.points.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}

      <div className="hint">נתוני רקע. ההוראה נשארת של מארק.</div>
    </div>
  );
}

function PositionCard({
  row,
  edit,
  canEdit,
  canCall,
  editingCall,
  confirmDel,
  research,
  onOpenCall,
  onSaveCall,
  onClearCall,
  onCancelCall,
  onAskDelete,
  onCancelDelete,
  onDelete,
  onResearch,
  onCloseResearch,
}) {
  const r = row;
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600 }} dir="ltr">
            {r.ticker}
          </div>
          <div className="meta" dir="ltr">
            {r.qty} × {usd(r.cost)}
          </div>
        </div>
        <div className="right">
          <div className="rv" dir="ltr">
            {r.value === null ? "—" : usd(r.value)}
          </div>
          <div className={"rd " + tone(r.plPct)} dir="ltr">
            {r.plPct === null ? "ממתין למחיר" : `${usd(r.pl, 0)} · ${pct(r.plPct)}`}
          </div>
          {r.day !== null && (
            <div className={"rd " + tone(r.day)} dir="ltr" style={{ opacity: 0.65 }}>
              היום {pct(r.day)}
            </div>
          )}
        </div>
      </div>

      {r.call && !editingCall && (
        <div className="call">
          <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
            <span className="callact">{CALLS.find((c) => c.id === r.call.action)?.he}</span>
            <span className="callmeta">מארק · {r.call.date}</span>
          </div>
          {r.call.note && <div className="callnote">{r.call.note}</div>}
        </div>
      )}

      {!editingCall && (
        <ResearchBlock
          ticker={r.ticker}
          price={r.price}
          entry={research}
          onRun={() => onResearch(r.ticker)}
          onClose={() => onCloseResearch(r.ticker)}
        />
      )}

      {edit && canEdit && !editingCall && (
        <div
          style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 8 }}
        >
          {canCall ? (
            <button className="btn sm" onClick={() => onOpenCall(r.id)}>
              {r.call ? "עריכת הוראה" : "כתיבת הוראה"}
            </button>
          ) : (
            <span />
          )}
          {confirmDel ? (
            <span style={{ display: "flex", gap: 6 }}>
              <button className="btn sm dg" onClick={() => onDelete(r.owner, r.id)}>
                לאשר מחיקה
              </button>
              <button className="btn sm" onClick={onCancelDelete}>
                ביטול
              </button>
            </span>
          ) : (
            <button className="btn sm dg" onClick={() => onAskDelete(r.id)}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}

      {edit && canCall && editingCall && (
        <CallEditor
          init={r.call}
          onSave={(a, n) => onSaveCall(r.owner, r.id, a, n)}
          onClear={() => onClearCall(r.owner, r.id)}
          onCancel={onCancelCall}
        />
      )}
    </div>
  );
}

function ValueChart({ history }) {
  const chartData = history.map((h) => ({ ...h, label: dayLabel(h.d) }));
  if (chartData.length < 2)
    return (
      <div className="hint" style={{ marginTop: 0 }}>
        נרשמה נקודה אחת. הגרף נפתח אחרי הרענון הבא ביום אחר — כל רענון שומר את שווי היום.
      </div>
    );
  return (
    <div style={{ height: 195, direction: "ltr", marginRight: -6 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: "#7E90AD", fontSize: 10.5 }}
            axisLine={{ stroke: "#1F2D45" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "#7E90AD", fontSize: 10.5 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={usdShort}
            width={50}
          />
          <Tooltip
            contentStyle={{
              background: "#0E1626",
              border: "1px solid #2B3C59",
              borderRadius: 11,
              fontSize: 12,
              padding: "8px 11px",
            }}
            labelStyle={{ color: "#7E90AD", marginBottom: 4 }}
            formatter={(v, n) => [usd(v, 0), String(n).toUpperCase()]}
          />
          {OWNERS.map((o) => (
            <Line
              key={o.id}
              type="monotone"
              dataKey={o.id}
              stroke={o.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Gate({ onPick }) {
  return (
    <div className="app wrap">
      <div style={{ paddingTop: 54, maxWidth: 420, margin: "0 auto" }}>
        <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-.02em" }}>תיק המשפחה</div>
        <div style={{ fontSize: 13.5, color: "var(--mut)", marginTop: 7, lineHeight: 1.6 }}>
          מי אתם? כולם רואים את כל התיקים, וכל אחד עורך רק את שלו.
        </div>
        <div style={{ marginTop: 22 }}>
          {OWNERS.map((o) => (
            <button
              key={o.id}
              className="btn"
              style={{
                width: "100%",
                marginBottom: 9,
                justifyContent: "flex-start",
                gap: 11,
                minHeight: 54,
                fontSize: 15,
              }}
              onClick={() => onPick(o.id)}
            >
              <span style={{ width: 9, height: 9, borderRadius: 99, background: o.color }} />
              {o.label}
              <span style={{ color: "var(--mut)", fontSize: 12.5, fontWeight: 400 }}>
                {o.id === "mark" ? "מנהל התיקים" : o.he}
              </span>
            </button>
          ))}
        </div>
        <div className="hint" style={{ marginTop: 26 }}>
          הבחירה נשמרת במכשיר שלכם. אפשר להחליף בכל רגע מהפינה התחתונה של המסך.
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const [data, setData] = useState(EMPTY);
  const [history, setHistory] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("manager");
  const [edit, setEdit] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [stamp, setStamp] = useState(null);
  const [draft, setDraft] = useState({ ticker: "", qty: "", cost: "" });
  const [openCall, setOpenCall] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [research, setResearch] = useState({});
  const saveTimer = useRef(null);

  /* ---- load ---- */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/state");
        if (res.ok) {
          const j = await res.json();
          setData({ ...EMPTY, ...(j.data || {}) });
          setHistory(j.history || []);
        }
      } catch (e) {
        setErr("לא הצלחתי לטעון את הנתונים.");
      }
      try {
        const who = window.localStorage.getItem("fam-me");
        if (who) setMe(who);
      } catch (e) {}
      setReady(true);
    })();
  }, []);

  /* ---- save, debounced so typing does not hit the server per keystroke ---- */
  const persist = useCallback((next) => {
    setData(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: next }),
      }).catch(() => setErr("השינוי לא נשמר."));
    }, 600);
  }, []);

  /* ---- prices ---- */
  const tickers = useMemo(() => {
    const s = new Set();
    Object.values(data.positions).forEach((l) => (l || []).forEach((p) => s.add(p.ticker)));
    return [...s];
  }, [data]);

  const refresh = useCallback(async () => {
    if (!tickers.length) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers }),
      });
      if (!res.ok) throw new Error();
      const q = await res.json();
      setQuotes((prev) => ({ ...prev, ...q }));
      setStamp(
        new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
      );

      const point = { d: isoDay() };
      OWNERS.forEach((o) => {
        point[o.id] = (data.positions[o.id] || []).reduce((s, p) => {
          const px = q[p.ticker] ? q[p.ticker].price : p.cost;
          return s + px * p.qty;
        }, 0);
      });
      setHistory((h) => [...h.filter((x) => x.d !== point.d), point]);
      fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyPoint: point }),
      }).catch(() => {});
    } catch (e) {
      setErr("לא הצלחתי למשוך מחירים כרגע.");
    } finally {
      setLoading(false);
    }
  }, [tickers, data]);

  useEffect(() => {
    if (ready && tickers.length && !stamp) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, tickers.length]);

  /* ---- research ---- */
  const runResearch = useCallback(async (ticker) => {
    setResearch((s) => ({ ...s, [ticker]: { loading: true } }));
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setResearch((s) => ({
        ...s,
        [ticker]: {
          data: d,
          at: new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
        },
      }));
    } catch (e) {
      setResearch((s) => ({ ...s, [ticker]: { error: true } }));
    }
  }, []);

  /* ---- math ---- */
  const allRows = useMemo(() => {
    return OWNERS.flatMap((o) =>
      (data.positions[o.id] || []).map((p) => {
        const q = quotes[p.ticker];
        const price = q ? q.price : null;
        const basis = p.cost * p.qty;
        const value = price ? price * p.qty : null;
        const pl = value === null ? null : value - basis;
        return {
          ...p,
          owner: o.id,
          price,
          basis,
          value,
          pl,
          plPct: value === null || !basis ? null : (pl / basis) * 100,
          day: q ? q.change : null,
          dayAbs: value === null || !q ? null : (value * q.change) / 100,
        };
      })
    );
  }, [data, quotes]);

  const book = (rows, cash, deposits) => {
    const held = rows.reduce((s, r) => s + (r.value ?? r.basis), 0);
    const basis = rows.reduce((s, r) => s + r.basis, 0);
    const day = rows.reduce((s, r) => s + (r.dayAbs || 0), 0);
    const total = held + cash;
    return {
      rows,
      held,
      cash,
      deposits,
      total,
      day,
      basis,
      profit: deposits ? total - deposits : held - basis,
      profitPct: deposits
        ? ((total - deposits) / deposits) * 100
        : basis
        ? ((held - basis) / basis) * 100
        : 0,
      hasDeposits: deposits > 0,
      dry: total ? (cash / total) * 100 : 0,
    };
  };

  const byOwner = useMemo(() => {
    const m = {};
    OWNERS.forEach((o) => {
      m[o.id] = book(
        allRows.filter((r) => r.owner === o.id),
        toNum(data.cash[o.id]),
        toNum(data.deposits[o.id])
      );
    });
    return m;
  }, [allRows, data]);

  const grand = useMemo(
    () =>
      book(
        allRows,
        OWNERS.reduce((s, o) => s + toNum(data.cash[o.id]), 0),
        OWNERS.reduce((s, o) => s + toNum(data.deposits[o.id]), 0)
      ),
    [allRows, data]
  );

  /* ---- permissions ---- */
  const canEdit = (owner) => me === "mark" || me === owner;
  const canCall = me === "mark";

  /* ---- mutations ---- */
  const changeMoney = (field, owner, v) =>
    persist({ ...data, [field]: { ...data[field], [owner]: v.replace(/[^\d.]/g, "") } });

  const addPosition = (owner) => {
    const ticker = draft.ticker.trim().toUpperCase();
    const qty = parseFloat(draft.qty);
    const cost = parseFloat(draft.cost);
    if (!ticker || !(qty > 0) || !(cost >= 0)) return;
    persist({
      ...data,
      positions: {
        ...data.positions,
        [owner]: [...(data.positions[owner] || []), { id: uid(), ticker, qty, cost, call: null }],
      },
    });
    setDraft({ ticker: "", qty: "", cost: "" });
  };

  const deletePosition = (owner, id) => {
    setConfirmDel(null);
    persist({
      ...data,
      positions: {
        ...data.positions,
        [owner]: data.positions[owner].filter((p) => p.id !== id),
      },
    });
  };

  const saveCall = (owner, id, action, note) => {
    setOpenCall(null);
    persist({
      ...data,
      positions: {
        ...data.positions,
        [owner]: data.positions[owner].map((p) =>
          p.id === id
            ? {
                ...p,
                call: action
                  ? {
                      action,
                      note,
                      date: new Date().toLocaleDateString("he-IL", {
                        day: "2-digit",
                        month: "2-digit",
                      }),
                    }
                  : null,
              }
            : p
        ),
      },
    });
  };

  const pickMe = (owner) => {
    try {
      window.localStorage.setItem("fam-me", owner);
    } catch (e) {}
    setMe(owner);
  };

  const clearMe = () => {
    try {
      window.localStorage.removeItem("fam-me");
    } catch (e) {}
    setMe(null);
    setEdit(false);
  };

  /* ---- render ---- */

  if (!ready)
    return (
      <div className="app wrap">
        <div className="empty" style={{ color: "var(--mut)" }}>טוען…</div>
      </div>
    );

  if (!me) return <Gate onPick={pickMe} />;

  const activeBook = tab === "manager" ? grand : byOwner[tab];
  const editableOwners = OWNERS.filter((o) => canEdit(o.id));
  const priced = allRows.filter((r) => r.plPct !== null);
  const maxAbs = Math.max(1, ...priced.map((r) => Math.abs(r.plPct)));
  const attention = allRows
    .filter((r) => !r.call || (r.day !== null && Math.abs(r.day) >= 4))
    .slice(0, 6);

  return (
    <div className="app">
      <div className="top">
        <div className="toprow">
          <div>
            <div className="kicker">
              {tab === "manager" ? "שווי כולל בניהול" : `תיק ${ownerOf(tab).he}`}
            </div>
            <div className="big" dir="ltr">
              {usd(activeBook.total, 0)}
            </div>
            <div className={"sub " + tone(activeBook.profit)} dir="ltr">
              {usd(activeBook.profit, 0)} ({pct(activeBook.profitPct)})
              <span style={{ color: "var(--mut)", fontWeight: 400 }}>
                {" · היום "}
                {usd(activeBook.day, 0)}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 7 }}>
            <button className="iconbtn" onClick={refresh} disabled={loading} aria-label="רענון">
              <RefreshCw size={17} className={loading ? "spin" : ""} />
            </button>
            {(tab === "manager" || canEdit(tab)) && (
              <button
                className="iconbtn"
                data-on={edit ? 1 : 0}
                onClick={() => {
                  setEdit((e) => !e);
                  setOpenCall(null);
                  setConfirmDel(null);
                }}
                aria-label="עריכה"
              >
                {edit ? <Check size={17} /> : <Pencil size={16} />}
              </button>
            )}
          </div>
        </div>

        <div className="seg">
          <button data-on={tab === "manager" ? 1 : 0} onClick={() => setTab("manager")}>
            מנהל
          </button>
          {OWNERS.map((o) => (
            <button key={o.id} data-on={tab === o.id ? 1 : 0} onClick={() => setTab(o.id)}>
              {o.label}
            </button>
          ))}
        </div>

        <div className="statusrow">
          <span>
            {loading ? "מושך מחירים…" : stamp ? `עודכן ${stamp}` : "לא נמשכו מחירים עדיין"}
          </span>
          <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {edit && <span style={{ color: "var(--blue2)" }}>מצב עריכה</span>}
            {!edit && tab !== "manager" && !canEdit(tab) && <span>צפייה בלבד</span>}
            <button
              onClick={clearMe}
              style={{
                background: "none",
                border: "none",
                color: "var(--mut)",
                fontSize: 11,
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span
                style={{ width: 6, height: 6, borderRadius: 99, background: ownerOf(me).color }}
              />
              {ownerOf(me).label}
            </button>
          </span>
        </div>
      </div>

      <div className="wrap">
        {err && <div className="banner bad">{err}</div>}

        {tab === "manager" ? (
          <>
            <CapitalStats b={grand} />

            {!grand.hasDeposits && (
              <div className="banner">
                הזינו כמה כסף הופקד בכל תיק כדי לראות תשואה אמיתית ולא רק רווח על הפוזיציות
                הפתוחות.
              </div>
            )}

            {edit && (
              <MoneyEditor data={data} owners={editableOwners} onChange={changeMoney} />
            )}

            <div className="card">
              <div className="ttl">התיקים</div>
              {OWNERS.map((o) => {
                const b = byOwner[o.id];
                return (
                  <div className="prow" key={o.id}>
                    <i className="rail" style={{ background: o.color }} />
                    <div className="grow">
                      <div className="name">{o.label}</div>
                      <div className="meta" dir="ltr">
                        {b.rows.length} פוזיציות · {usd(b.cash, 0)} פנוי
                      </div>
                      <div className="bar">
                        <i
                          style={{
                            width: Math.min(Math.max(b.dry, 1), 100) + "%",
                            background: "var(--cash)",
                            opacity: 0.7,
                          }}
                        />
                      </div>
                    </div>
                    <div className="right">
                      <div className="rv" dir="ltr">{usd(b.total, 0)}</div>
                      <div className={"rd " + tone(b.profit)} dir="ltr">
                        {pct(b.profitPct)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card">
              <div className="ttl">שווי אחזקות לאורך זמן</div>
              <ValueChart history={history} />
            </div>

            <div className="card">
              <div className="ttl">רווח והפסד לפי פוזיציה</div>
              {priced.length === 0 ? (
                <div className="hint" style={{ marginTop: 0 }}>ממתין למחירים.</div>
              ) : (
                [...priced]
                  .sort((a, b) => b.plPct - a.plPct)
                  .map((r) => {
                    const w = (Math.abs(r.plPct) / maxAbs) * 50;
                    const gain = r.plPct >= 0;
                    return (
                      <div key={r.id} style={{ marginBottom: 14 }}>
                        <div
                          style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}
                        >
                          <span dir="ltr" style={{ fontWeight: 600 }}>
                            {r.ticker}
                            <span style={{ color: "var(--mut)", fontWeight: 400, marginLeft: 8 }}>
                              {ownerOf(r.owner).label}
                            </span>
                          </span>
                          <span className={tone(r.pl)} dir="ltr" style={{ fontWeight: 500 }}>
                            {usd(r.pl, 0)} · {pct(r.plPct)}
                          </span>
                        </div>
                        <div className="dv" dir="ltr">
                          <i
                            style={{
                              [gain ? "left" : "right"]: "50%",
                              width: Math.max(w, 0.7) + "%",
                              background: gain ? "var(--up)" : "var(--down)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            <div className="card">
              <div className="ttl">פיזור אחזקות</div>
              {allRows.length === 0 ? (
                <div className="hint" style={{ marginTop: 0 }}>אין עדיין פוזיציות.</div>
              ) : (
                [...allRows]
                  .sort((a, b) => (b.value ?? b.basis) - (a.value ?? a.basis))
                  .slice(0, 12)
                  .map((r) => {
                    const w = grand.held ? ((r.value ?? r.basis) / grand.held) * 100 : 0;
                    return (
                      <div key={r.id} style={{ marginBottom: 12 }}>
                        <div
                          style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}
                        >
                          <span dir="ltr" style={{ fontWeight: 600 }}>
                            {r.ticker}
                            <span style={{ color: "var(--mut)", fontWeight: 400, marginLeft: 8 }}>
                              {ownerOf(r.owner).label}
                            </span>
                          </span>
                          <span style={{ color: "var(--mut)" }} dir="ltr">
                            {w.toFixed(1)}%
                          </span>
                        </div>
                        <div className="bar">
                          <i
                            style={{
                              width: Math.max(w, 1.5) + "%",
                              background: ownerOf(r.owner).color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            <div className="card">
              <div className="ttl">דורש החלטה</div>
              {attention.length === 0 ? (
                <div className="hint" style={{ marginTop: 0 }}>
                  לכל פוזיציה יש הוראה ואין תנועות חריגות היום.
                </div>
              ) : (
                attention.map((r) => (
                  <div className="prow" key={r.id}>
                    <div className="grow">
                      <span className="name" dir="ltr">{r.ticker}</span>
                      <span style={{ fontSize: 11.5, color: "var(--mut)", marginRight: 8 }}>
                        {ownerOf(r.owner).label}
                      </span>
                      <div className="meta">{!r.call ? "אין הוראה" : "תנועה חדה היום"}</div>
                    </div>
                    <div className={"rd " + tone(r.day)} dir="ltr">
                      {r.day === null ? "—" : pct(r.day)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <CapitalStats b={byOwner[tab]} />

            {edit && canEdit(tab) && (
              <>
                <MoneyEditor data={data} owners={editableOwners} onChange={changeMoney} />
                <div className="card">
                  <div className="ttl">הוספת פוזיציה ל{ownerOf(tab).he}</div>
                  <div className="g3" style={{ marginBottom: 11 }}>
                    <div>
                      <span className="lbl">סימול</span>
                      <input
                        className="inp"
                        dir="ltr"
                        placeholder="AAPL"
                        value={draft.ticker}
                        onChange={(e) => setDraft({ ...draft, ticker: e.target.value })}
                      />
                    </div>
                    <div>
                      <span className="lbl">כמות</span>
                      <input
                        className="inp"
                        dir="ltr"
                        inputMode="decimal"
                        placeholder="12"
                        value={draft.qty}
                        onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
                      />
                    </div>
                    <div>
                      <span className="lbl">מחיר קנייה</span>
                      <input
                        className="inp"
                        dir="ltr"
                        inputMode="decimal"
                        placeholder="180.5"
                        value={draft.cost}
                        onChange={(e) => setDraft({ ...draft, cost: e.target.value })}
                      />
                    </div>
                  </div>
                  <button className="btn pri" onClick={() => addPosition(tab)}>
                    <Plus size={16} /> הוספה
                  </button>
                </div>
              </>
            )}

            {byOwner[tab].rows.length === 0 ? (
              <div className="empty">
                <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>התיק ריק</div>
                <div style={{ fontSize: 13, color: "var(--mut)" }}>
                  {canEdit(tab)
                    ? "פתחו מצב עריכה בכפתור העיפרון והוסיפו את המניה הראשונה."
                    : `רק ${ownerOf(tab).he} ומארק יכולים להוסיף פוזיציות לתיק הזה.`}
                </div>
              </div>
            ) : (
              byOwner[tab].rows.map((r) => (
                <PositionCard
                  key={r.id}
                  row={r}
                  edit={edit}
                  canEdit={canEdit(tab)}
                  canCall={canCall}
                  editingCall={openCall === r.id}
                  confirmDel={confirmDel === r.id}
                  research={research[r.ticker]}
                  onOpenCall={setOpenCall}
                  onSaveCall={saveCall}
                  onClearCall={(o, id) => saveCall(o, id, null, "")}
                  onCancelCall={() => setOpenCall(null)}
                  onAskDelete={setConfirmDel}
                  onCancelDelete={() => setConfirmDel(null)}
                  onDelete={deletePosition}
                  onResearch={runResearch}
                  onCloseResearch={(t) =>
                    setResearch((s) => {
                      const n = { ...s };
                      delete n[t];
                      return n;
                    })
                  }
                />
              ))
            )}
          </>
        )}
      </div>

      <div className="foot">
        המחירים מגיעים מ-Yahoo Finance ועשויים להתעכב — הם למעקב, לא לביצוע עסקאות. גרף השווי
        עוקב אחרי האחזקות בלבד, כך שהפקדה חדשה לא נראית כמו רווח. הכלי לא מהווה ייעוץ השקעות.
      </div>
    </div>
  );
}
