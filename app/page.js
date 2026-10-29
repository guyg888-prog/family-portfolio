"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  RefreshCw,
  Pencil,
  Check,
  Plus,
  Trash2,
  Sparkles,
  X,
  ArrowUpRight,
  ArrowDownRight,
  LayoutGrid,
  Wallet,
  LogOut,
  TrendingUp,
  TrendingDown,
  Coins,
  Activity,
  CircleCheck,
  AlertTriangle,
  ChartNoAxesCombined,
} from "lucide-react";

/* ------------------------------------------------------------------ */

const OWNERS = [
  { id: "mark", label: "MARK", he: "מארק", color: "#131A3F" },
  { id: "ron", label: "RON", he: "רון", color: "#3B6FE0" },
  { id: "guy", label: "GUY", he: "גיא", color: "#7CC3F0" },
];

function OwnerAvatar({ owner, size = "normal" }) {
  return <span className={`owner-avatar owner-avatar-${size}`} style={{ background: owner.color }}>
    {["ron", "mark", "guy"].includes(owner.id) ? <img src={`/avatars/${owner.id}.webp${owner.id === "ron" ? "?v=2" : ""}`} alt="" /> : <span>{owner.label[0]}</span>}
  </span>;
}

const CALLS = [
  { id: "buy", he: "להגדיל" },
  { id: "hold", he: "להחזיק" },
  { id: "trim", he: "לצמצם" },
  { id: "sell", he: "למכור" },
];

const PALETTE = ["#131A3F", "#3B6FE0", "#7CC3F0", "#12B76A", "#F79009", "#9E77ED", "#0BA5C7", "#F04438"];

const EMPTY = {
  positions: { mark: [], ron: [], guy: [] },
  cash: { mark: "", ron: "", guy: "" },
  deposits: { mark: "", ron: "", guy: "" },
  realized: { mark: "", ron: "", guy: "" },
};

const usd = (n, d = 2) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: d,
  }).format(n || 0);

const usdShort = (n) =>
  Math.abs(n) >= 1000 ? "$" + (n / 1000).toFixed(1) + "k" : "$" + Math.round(n || 0);

const pct = (n) => (n > 0 ? "+" : "") + (n || 0).toFixed(1) + "%";
const toNum = (v) => Number(String(v).replace(/[^\d.-]/g, "")) || 0;
const uid = () => Math.random().toString(36).slice(2, 9);
const isoDay = () => new Date().toISOString().slice(0, 10);
const dayLabel = (iso) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
const tone = (n) => (n > 0 ? "up" : n < 0 ? "down" : "flat");
const ownerOf = (id) => OWNERS.find((o) => o.id === id);
const todayHe = () =>
  new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });

/* ------------------------------------------------------------------ */
/* pieces — module level, so inputs never lose focus                   */
/* ------------------------------------------------------------------ */

function Kpi({ label, value, delta, foot }) {
  return (
    <div className="kpi">
      <span className="lab">{label}</span>
      <div className="val" dir="ltr">{value}</div>
      {delta !== undefined && delta !== null && (
        <span className={"tag " + tone(delta)}>
          {delta > 0 ? <ArrowUpRight size={12} /> : delta < 0 ? <ArrowDownRight size={12} /> : null}
          <span dir="ltr">{pct(delta)}</span>
        </span>
      )}
      {foot && <div className="foot">{foot}</div>}
    </div>
  );
}

function PortfolioSummary({ book, isOverview }) {
  const purchaseChange = book.held - book.basis;
  const purchasePct = book.basis ? (purchaseChange / book.basis) * 100 : 0;
  const change = (label, amount, percent) => (
    <div className="summary-change">
      <div className="summary-change-label">{amount > 0 ? <TrendingUp size={17} /> : amount < 0 ? <TrendingDown size={17} /> : <Activity size={17} />}{label}</div>
      <div className={"summary-change-amount " + tone(amount)} dir="ltr">
        <span className="summary-change-percent">{pct(percent)}</span>
        <span className="summary-change-money">{amount > 0 ? "+" : amount < 0 ? "−" : ""}{usd(Math.abs(amount), 2)}</span>
      </div>
    </div>
  );
  return (
    <section className="portfolio-summary" aria-label="סיכום מצב התיק">
      <div className="summary-title">{isOverview ? "שווי התיקים הכולל" : "מצב החשבון שלי"}</div>
      <div className="summary-total" dir="ltr">{usd(book.total, 0)}</div>
      <div className="summary-changes">
        {change("שינוי יומי", book.day, book.dayPct)}
        {change("שינוי ממועד הקנייה", purchaseChange, purchasePct)}
      </div>
      
    </section>
  );
}

function CashTile({ cash, onEdit }) {
  return <aside className="cash-tile">
    <div className="cash-tile-top">
      <div className="cash-tile-icon"><Coins size={22} /></div>

    </div>
    <div className="cash-tile-content"><div className="cash-tile-title"><span>מזומן פנוי להשקעה</span>{onEdit && <button type="button" className="cash-edit" onClick={onEdit} aria-label="עריכת מזומן פנוי להשקעה" title="עריכת מזומן פנוי להשקעה"><Pencil size={15} /></button>}</div><strong dir="ltr">{usd(cash, 0)}</strong><small>יתרה זמינה בחשבון</small></div>
  </aside>;
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-panel" role="dialog" aria-modal="true" aria-label={title}><header className="modal-heading"><h2>{title}</h2><button className="icb" onClick={onClose} aria-label="סגירה"><X size={19}/></button></header>{children}</section></div>;
}

function Donut({ slices, centerValue, centerLabel, expanded = false }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const [active, setActive] = useState(null);
  if (!total)
    return <div className="hint">אין עדיין אחזקות להצגה.</div>;
  return (
    <div className={"donutwrap" + (expanded ? " donutwrap-expanded" : "")}>
      <div className="donut">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              innerRadius={expanded ? "53%" : 52}
              outerRadius={expanded ? "76%" : 74}
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
              onMouseEnter={(_, index) => setActive(index)}
              onMouseLeave={() => setActive(null)}
            >
              {slices.map((s, i) => (
                <Cell key={i} fill={s.color} opacity={active === null || active === i ? 1 : 0.35} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name, item) => [usd(value), item?.payload?.name || name]} content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0].payload;
              return <div className="donut-tooltip"><strong>{item.name}</strong><span dir="ltr">{usd(item.value)} · {((item.value / total) * 100).toFixed(1)}%</span></div>;
            }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donutmid">
          <b dir="ltr">{centerValue}</b>
          <span>{centerLabel}</span>
        </div>
      </div>
      <div className="legend">
        {slices.map((s, i) => (
          <div className={"lrow" + (active === i ? " lrow-active" : "")} key={i} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
            <i className="dot" style={{ background: s.color }} />
            <span className="nm">{s.name}</span>
            {expanded && <span className="legend-value" dir="ltr">{usd(s.value, 0)}</span>}
            <span className="vl" dir="ltr">{((s.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendChart({ history, keys }) {
  const data = history.map((h) => ({
    label: dayLabel(h.d),
    total: keys.reduce((s, k) => s + (h[k] || 0), 0),
  }));
  if (data.length < 2)
    return (
      <div className="hint">
        נרשמה נקודה אחת בלבד. הגרף נפתח אחרי הרענון הבא ביום אחר — כל רענון שומר את שווי היום.
      </div>
    );
  return (
    <div style={{ height: 180, direction: "ltr", marginRight: -8, marginLeft: -8 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B6FE0" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#3B6FE0" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fill: "#97A3BA", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={26}
          />
          <YAxis
            tick={{ fill: "#97A3BA", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={usdShort}
            width={48}
          />
          <Tooltip
            contentStyle={{
              background: "#fff",
              border: "1px solid #E8ECF4",
              borderRadius: 12,
              fontSize: 12,
              boxShadow: "0 8px 24px rgba(16,23,54,.10)",
            }}
            labelStyle={{ color: "#6B7A99", marginBottom: 2 }}
            formatter={(v) => [usd(v, 0), "שווי"]}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#3B6FE0"
            strokeWidth={2.4}
            fill="url(#fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CallPill({ call }) {
  if (!call) return <span className="pill none">אין הוראה</span>;
  return <span className={"pill " + call.action}>{CALLS.find((c) => c.id === call.action)?.he}</span>;
}

function MoneyEditor({ data, owners, books, onChange }) {
  if (!owners.length) return null;
  return (
    <div className="card">
      <div className="ctitle">כסף בתיק</div>
      <div className="csub">
        הזינו כמה כסף הוכנס לחשבון. הפנוי מחושב לבד — כל פוזיציה שנוספת יורדת ממנו.
      </div>
      {owners.map((o) => {
        const b = books[o.id] || {};
        return (
          <div key={o.id} style={{ marginBottom: 16 }}>
            {owners.length > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <i className="dot" style={{ background: o.color }} />
                <span className="t1">{o.label}</span>
              </div>
            )}
            <span className="lbl">סה״כ הופקד לחשבון</span>
            <input
              className="inp"
              dir="ltr"
              inputMode="decimal"
              placeholder="0"
              value={data.deposits[o.id] ?? ""}
              onChange={(e) => onChange("deposits", o.id, e.target.value)}
            />

            <div className="calcrow">
              <span>
                הושקע במניות
                <b dir="ltr"> {usd(b.basis || 0, 0)}</b>
              </span>
              <span>
                נותר פנוי
                <b dir="ltr" className={b.autoCash < 0 ? "down" : ""}>
                  {" "}
                  {usd(b.manual ? b.cash : b.autoCash || 0, 0)}
                </b>
              </span>
            </div>

            {b.autoCash < 0 && !b.manual && (
              <div className="hint" style={{ color: "var(--down)" }}>
                ההשקעות גדולות מההפקדות שהזנתם. בדקו את הסכום שהוכנס לחשבון.
              </div>
            )}

            {b.manual ? (
              <>
                <span className="lbl" style={{ marginTop: 12 }}>פנוי — ערך ידני</span>
                <input
                  className="inp"
                  dir="ltr"
                  inputMode="decimal"
                  value={data.cash[o.id] ?? ""}
                  onChange={(e) => onChange("cash", o.id, e.target.value)}
                />
                <button
                  className="btn sm"
                  style={{ marginTop: 8 }}
                  onClick={() => onChange("cash", o.id, "")}
                >
                  חזרה לחישוב אוטומטי
                </button>
              </>
            ) : (
              <button
                className="btn sm"
                style={{ marginTop: 10 }}
                onClick={() => onChange("cash", o.id, String(Math.max(0, Math.round(b.autoCash || 0))))}
              >
                תיקון ידני של הפנוי
              </button>
            )}
          </div>
        );
      })}
      <div className="hint">
        אחרי מכירה הכסף חוזר לחשבון והחישוב לא יודע על כך. במקרה כזה תקנו ידנית, או עדכנו את
        סכום ההפקדות.
      </div>
    </div>
  );
}

function AddPosition({ draft, setDraft, onAdd, ownerHe }) {
  return (
    <div className="card">
      
      <div className="csub">סימול אמריקאי כמו AAPL. לבורסת תל אביב הוסיפו סיומת, למשל TEVA.TA</div>
      <div className="g3" style={{ marginBottom: 12 }}>
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
      <button className="btn pri wide" onClick={onAdd}>
        <Plus size={17} /> הוספה
      </button>
    </div>
  );
}

function CallEditor({ init, onSave, onClear, onCancel }) {
  const [action, setAction] = useState(init?.action || "hold");
  const [note, setNote] = useState(init?.note || "");
  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
      <span className="lbl">ההוראה</span>
      <div className="chips">
        {CALLS.map((c) => (
          <button key={c.id} className="chip" data-on={action === c.id ? 1 : 0} onClick={() => setAction(c.id)}>
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
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button className="btn pri sm" onClick={() => onSave(action, note)}>פרסום</button>
        <button className="btn sm" onClick={onCancel}>ביטול</button>
        {init && <button className="btn sm dg" onClick={onClear}>הסרה</button>}
      </div>
    </div>
  );
}

function Research({ ticker, price, entry, onRun, onClose }) {
  if (!entry)
    return (
      <button className="btn sm wide" style={{ marginTop: 12 }} onClick={onRun}>
        <Sparkles size={15} /> ניתוח
      </button>
    );
  if (entry.loading)
    return <div className="rs"><span className="hint">אוסף נתונים על {ticker}…</span></div>;
  if (entry.error)
    return (
      <div className="rs" style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <span className="hint" style={{ color: "var(--down)" }}>הניתוח נכשל.</span>
        <button className="btn sm" onClick={onRun}>נסו שוב</button>
      </div>
    );

  const d = entry.data || {};
  const now = price ?? d.price;
  const gap = d.target && now ? ((d.target - now) / now) * 100 : null;
  const span = d.high52 && d.low52 ? d.high52 - d.low52 : null;
  const pos = span && now ? Math.min(99, Math.max(1, ((now - d.low52) / span) * 100)) : null;

  return (
    <div className="rs">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span className="hint">{d.company || ticker} · נבדק {entry.at}</span>
        
      </div>
      <div className="rsg">
        <div className="rsi">
          <span>המלצת אנליסטים</span>
          <b>{d.consensus || "—"}{d.analysts ? <small style={{ color: "var(--mut)", fontWeight: 400 }}> ({d.analysts})</small> : null}</b>
        </div>
        <div className="rsi">
          <span>יעד מחיר ממוצע</span>
          <b dir="ltr">
            {d.target ? usd(d.target) : "—"}
            {gap !== null && <small className={tone(gap)}> {pct(gap)}</small>}
          </b>
        </div>
        <div className="rsi"><span>מכפיל רווח</span><b dir="ltr">{d.pe ? d.pe.toFixed(1) : "—"}</b></div>
        <div className="rsi"><span>מחיר נוכחי</span><b dir="ltr">{now ? usd(now) : "—"}</b></div>
      </div>
      {pos !== null && (
        <div>
          <span className="lbl" style={{ marginBottom: 0 }}>טווח 52 שבועות</span>
          <div className="rng" dir="ltr"><i style={{ left: pos + "%" }} /></div>
          <div className="rngl" dir="ltr"><span>{usd(d.low52, 0)}</span><span>{usd(d.high52, 0)}</span></div>
        </div>
      )}
      {Array.isArray(d.points) && d.points.length > 0 && (
        <ul className="pts">{d.points.map((p, i) => <li key={i}>{p}</li>)}</ul>
      )}
      <div className="hint" style={{ marginTop: 10 }}>נתוני רקע. ההוראה נשארת של מארק.</div>
    </div>
  );
}

function PositionEditor({ row, onBuy, onSell, onFix, onCancel }) {
  const [mode, setMode] = useState("buy");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [fixQty, setFixQty] = useState(String(row.qty));
  const [fixCost, setFixCost] = useState(String(row.cost));

  const n = parseFloat(qty);
  const p = parseFloat(price);
  const valid = n > 0 && p >= 0;
  const tooMany = mode === "sell" && n > row.qty;

  const preview = () => {
    if (!valid) return null;
    if (mode === "buy") {
      const newQty = row.qty + n;
      const newCost = (row.qty * row.cost + n * p) / newQty;
      return `אחרי הקנייה: ${newQty} יחידות, מחיר ממוצע ${usd(newCost)}`;
    }
    if (tooMany) return null;
    const left = row.qty - n;
    return left === 0
      ? `מכירה מלאה. ${usd(n * p)} יתווספו לפנוי והפוזיציה תיסגר.`
      : `אחרי המכירה: ${left} יחידות. ${usd(n * p)} יתווספו לפנוי.`;
  };

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
      <div className="chips" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        <button className="chip" data-on={mode === "buy" ? 1 : 0} onClick={() => setMode("buy")}>
          קניתי עוד
        </button>
        <button className="chip" data-on={mode === "sell" ? 1 : 0} onClick={() => setMode("sell")}>
          מכרתי
        </button>
        <button className="chip" data-on={mode === "fix" ? 1 : 0} onClick={() => setMode("fix")}>
          תיקון
        </button>
      </div>

      {mode === "fix" ? (
        <>
          <div className="g2">
            <div>
              <span className="lbl">כמות</span>
              <input
                className="inp"
                dir="ltr"
                inputMode="decimal"
                value={fixQty}
                onChange={(e) => setFixQty(e.target.value)}
              />
            </div>
            <div>
              <span className="lbl">מחיר קנייה ממוצע</span>
              <input
                className="inp"
                dir="ltr"
                inputMode="decimal"
                value={fixCost}
                onChange={(e) => setFixCost(e.target.value)}
              />
            </div>
          </div>
          <div className="hint" style={{ marginTop: 8 }}>
            תיקון של נתון שהוזן שגוי. אינו משפיע על הכסף הפנוי כמכירה.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              className="btn pri sm"
              onClick={() => onFix(parseFloat(fixQty), parseFloat(fixCost))}
              disabled={!(parseFloat(fixQty) > 0) || !(parseFloat(fixCost) >= 0)}
            >
              שמירה
            </button>
            <button className="btn sm" onClick={onCancel}>ביטול</button>
          </div>
        </>
      ) : (
        <>
          <div className="g2">
            <div>
              <span className="lbl">{mode === "buy" ? "כמה נקנו" : "כמה נמכרו"}</span>
              <input
                className="inp"
                dir="ltr"
                inputMode="decimal"
                placeholder={mode === "sell" ? String(row.qty) : "0"}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <div>
              <span className="lbl">{mode === "buy" ? "מחיר לקנייה" : "מחיר למכירה"}</span>
              <input
                className="inp"
                dir="ltr"
                inputMode="decimal"
                placeholder="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>

          {tooMany && (
            <div className="hint" style={{ color: "var(--down)", marginTop: 8 }}>
              יש רק {row.qty} יחידות בפוזיציה.
            </div>
          )}
          {preview() && <div className="calcrow" style={{ marginTop: 10 }}>{preview()}</div>}

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              className="btn pri sm"
              disabled={!valid || tooMany}
              onClick={() => (mode === "buy" ? onBuy(n, p) : onSell(n, p))}
            >
              {mode === "buy" ? "הוספה לפוזיציה" : "רישום מכירה"}
            </button>
            <button className="btn sm" onClick={onCancel}>ביטול</button>
          </div>
        </>
      )}
    </div>
  );
}

const STOCK_RANGES = [["1D","יום"],["1W","שבוע"],["1M","חודש"],["3M","3 חודשים"],["1Y","שנה"],["5Y","5 שנים"]];
const STOCK_LOGO_DOMAINS = {
 AAPL:"apple.com", MSFT:"microsoft.com", GOOGL:"google.com", GOOG:"google.com",
 AMZN:"amazon.com", META:"meta.com", NVDA:"nvidia.com", TSLA:"tesla.com",
 NFLX:"netflix.com", AMD:"amd.com", INTC:"intel.com", PLTR:"palantir.com",
 ONON:"on.com", NKE:"nike.com", DIS:"disney.com", PYPL:"paypal.com",
 SHOP:"shopify.com", UBER:"uber.com", ABNB:"airbnb.com", COIN:"coinbase.com",
 HOOD:"robinhood.com", SOFI:"sofi.com", SQ:"block.xyz", XYZ:"block.xyz",
 V:"visa.com", MA:"mastercard.com", JPM:"jpmorganchase.com", BAC:"bankofamerica.com",
 "BRK.B":"berkshirehathaway.com", KO:"coca-cola.com", PEP:"pepsico.com",
 COST:"costco.com", WMT:"walmart.com", TGT:"target.com", MCD:"mcdonalds.com",
 SBUX:"starbucks.com", CRM:"salesforce.com", ORCL:"oracle.com", ADBE:"adobe.com",
 IBM:"ibm.com", QCOM:"qualcomm.com", AVGO:"broadcom.com", TSM:"tsmc.com",
 ASML:"asml.com", MU:"micron.com", ARM:"arm.com", SMCI:"supermicro.com",
 RDDT:"reddit.com", SNAP:"snap.com", SPOT:"spotify.com", RBLX:"roblox.com",
 DUOL:"duolingo.com", CRWD:"crowdstrike.com", PANW:"paloaltonetworks.com",
 NET:"cloudflare.com", DDOG:"datadoghq.com", SNOW:"snowflake.com",
 ZS:"zscaler.com", OKTA:"okta.com", MDB:"mongodb.com", NOW:"servicenow.com",
 VOO:"vanguard.com", VTI:"vanguard.com", VGT:"vanguard.com", VUG:"vanguard.com",
 QQQ:"invesco.com", QQQM:"invesco.com", SPY:"ssga.com", IVV:"ishares.com",
 IWM:"ishares.com", IBIT:"ishares.com", SCHD:"schwab.com", SCHG:"schwab.com",
 BABA:"alibabagroup.com", JD:"jd.com", PDD:"pddholdings.com", NIO:"nio.com",
 LI:"lixiang.com", XPEV:"xpeng.com", RIVN:"rivian.com", LCID:"lucidmotors.com",
 F:"ford.com", GM:"gm.com", BA:"boeing.com", CAT:"caterpillar.com",
 GE:"ge.com", LLY:"lilly.com", UNH:"unitedhealthgroup.com", JNJ:"jnj.com",
 PFE:"pfizer.com", ABBV:"abbvie.com", MRK:"merck.com", NVO:"novonordisk.com",
 ISRG:"intuitive.com", HIMS:"hims.com", CELH:"celsius.com",
 ENPH:"enphase.com", FSLR:"firstsolar.com", XOM:"exxonmobil.com",
 CVX:"chevron.com", OXY:"oxy.com", T:"att.com", VZ:"verizon.com",
 TMUS:"t-mobile.com", CSCO:"cisco.com", DELL:"dell.com", HPQ:"hp.com",
 LULU:"lululemon.com", CROX:"crocs.com", DECK:"deckers.com",
 SE:"sea.com", MELI:"mercadolibre.com", NU:"nu.com", GRAB:"grab.com",
 BTC:"bitcoin.org", ETH:"ethereum.org"
};
function StockLogo({ticker}) {
 const symbol = String(ticker || "").trim().toUpperCase();
 const domain = STOCK_LOGO_DOMAINS[symbol];
 const [source,setSource] = useState(0);
 useEffect(() => setSource(0), [symbol]);
 const images = [
   ...(domain ? [`https://www.google.com/s2/favicons?domain=${domain}&sz=128`] : []),
   `https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`,
   `https://assets.parqet.com/logos/symbol/${encodeURIComponent(symbol)}?format=png`
 ];
 return <div className="stock-logo">
   {source < images.length
     ? <img key={symbol + "-" + source} src={images[source]} alt={`לוגו ${symbol}`} onError={() => setSource(i => i + 1)} loading="lazy" />
     : <ChartNoAxesCombined size={23} strokeWidth={1.8} aria-label="סמל מניה" />}
 </div>;
}
function StockHistory({ticker}) {
 const [range,setRange]=useState("1M");
 const [cache,setCache]=useState({});
 const [loading,setLoading]=useState(false);
 useEffect(()=>{
   if (Object.prototype.hasOwnProperty.call(cache,range)) return;
   const controller=new AbortController();
   setLoading(true);
   fetch(`/api/history?ticker=${encodeURIComponent(ticker)}&range=${range}`,{signal:controller.signal})
    .then(r=>r.ok?r.json():Promise.reject(new Error("unavailable")))
    .then(data=>setCache(old=>({...old,[range]:data.points||[]})))
    .catch(e=>{if(e.name!=="AbortError")setCache(old=>({...old,[range]:[]}));})
    .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
   return ()=>controller.abort();
 },[ticker,range,cache]);
 const points=cache[range];
 const positive=!points?.length||points[points.length-1].close>=points[0].close;
 return <div className="stock-history"><div className="stock-ranges">{STOCK_RANGES.map(([key,label])=><button key={key} type="button" data-on={range===key?1:0} onClick={()=>setRange(key)}>{label}</button>)}</div><div className="stock-chart">{points === undefined ? <div className="skel skel-stock-chart" role="status" aria-label="טוען גרף מניה" /> : points?.length>1?<ResponsiveContainer width="100%" height="100%"><AreaChart data={points}><Tooltip formatter={v=>usd(v)} labelFormatter={v=>new Date(v).toLocaleString("he-IL")}/><Area dataKey="close" type="monotone" stroke={positive?"#12b76a":"#f04438"} fill="none" strokeWidth={2} dot={false} isAnimationActive={false}/></AreaChart></ResponsiveContainer>:<div className="stock-chart-placeholder">{loading?"טוען גרף…":"אין נתוני גרף זמינים"}</div>}</div></div>;
}
function PositionCard(props) {
  const { r, canEdit, canCall, editing, adjusting, confirming, research, portfolioTotal } = props;
  const weight = portfolioTotal > 0 ? ((r.value ?? r.basis) / portfolioTotal) * 100 : 0;
  const dayMoney = r.dayAbs;
  return (
    <article className="stock-card">
      <div className="stock-card-head">
        <StockLogo ticker={r.ticker} />
        <div className="stock-identity">
          <div className="stock-ticker" dir="ltr">{r.ticker}</div>

        </div>
        <div className="stock-price">
          <div className="stock-price-line"><span>מחיר מניה</span><strong dir="ltr">{r.price === null ? "—" : usd(r.price)}</strong></div>
          <span className={tone(r.day)} dir="ltr">{r.day === null ? "—" : pct(r.day)}</span>
        </div>
      </div>

      <StockHistory ticker={r.ticker} />

      <div className="stock-stats">
        <div><span>מספר מניות</span><strong dir="ltr">{r.qty}</strong></div>
        <div><span>שווי אחזקה</span><strong dir="ltr">{r.value === null ? "—" : usd(r.value)}</strong></div>
        <div><span>מחיר קנייה ממוצע</span><strong dir="ltr">{usd(r.cost)}</strong></div>
        <div><span>אחוז מהחשבון</span><strong dir="ltr">{pct(weight)}</strong></div>
      </div>

      <div className="stock-performance">
        <div>
          <span className="stock-change-label">{dayMoney > 0 ? <TrendingUp size={16} /> : dayMoney < 0 ? <TrendingDown size={16} /> : <Activity size={16} />} שינוי יומי</span>
          <strong className={tone(dayMoney)} dir="ltr">
            {dayMoney === null ? "—" : <><span className="stock-pct">{pct(r.day)}</span><span className="stock-money">{dayMoney > 0 ? "+" : ""}{usd(dayMoney)}</span></>}
          </strong>
        </div>
        <div>
          <span className="stock-change-label">{r.pl > 0 ? <TrendingUp size={16} /> : r.pl < 0 ? <TrendingDown size={16} /> : <Activity size={16} />} שינוי ממועד הקנייה</span>
          <strong className={tone(r.pl)} dir="ltr">
            {r.pl === null ? "—" : <><span className="stock-pct">{pct(r.plPct)}</span><span className="stock-money">{r.pl > 0 ? "+" : ""}{usd(r.pl)}</span></>}
          </strong>
        </div>
      </div>

      {r.call && !editing && (
        <div className="note">
          <div className="notehead"><CallPill call={r.call} /><span className="notemeta">מארק · {r.call.date}</span></div>
          {r.call.note && <div className="notetxt">{r.call.note}</div>}
        </div>
      )}

      {!editing && !adjusting && (
        <div className="stock-actions">
          <button className="btn sm stock-analysis-btn" onClick={() => props.onResearch(r.ticker)}><Sparkles size={15} /> ניתוח מניה</button>
          {canEdit && <button className="btn sm" onClick={() => props.onOpenAdjust(r.id)}><Pencil size={14} /> עריכת מניה</button>}
          {canEdit && canCall && (
            <button className="btn sm" onClick={() => props.onOpenCall(r.id)}>
              {r.call ? "עריכת הוראה" : "הוראה"}
            </button>
          )}
          {canEdit && <button className="btn sm dg" onClick={() => props.onAskDelete(r.id)} aria-label={`מחיקת ${r.ticker}`}><Trash2 size={15} /></button>}
        </div>
      )}

      {canEdit && adjusting && (
        <PositionEditor row={r}
          onBuy={(q, p) => props.onBuy(r.owner, r.id, q, p)}
          onSell={(q, p) => props.onSell(r.owner, r.id, q, p)}
          onFix={(q, c) => props.onFix(r.owner, r.id, q, c)}
          onCancel={props.onCancelAdjust} />
      )}
      {canCall && editing && (
        <CallEditor init={r.call}
          onSave={(a, n) => props.onSaveCall(r.owner, r.id, a, n)}
          onClear={() => props.onSaveCall(r.owner, r.id, null, "")}
          onCancel={props.onCancelCall} />
      )}
    </article>
  );
}

function Gate({ onPick }) {
  return (
    <div className="gate">
      <div className="gatebox">
        <div style={{ fontSize: 25, fontWeight: 700, letterSpacing: "-.02em" }}>תיק המשפחה</div>
        <div style={{ fontSize: 14, color: "var(--mut)", margin: "8px 0 24px", lineHeight: 1.6 }}>
          מי אתם? כל אחד רואה ועורך רק את התיק שלו. מארק רואה את שלושתם.
        </div>
        <div className="profile-picker">
        {OWNERS.map((o) => (
          <button key={o.id} className="pick profile-pick" onClick={() => onPick(o.id)}>
            <OwnerAvatar owner={o} size="large" />
            <span className="grow">
              <span className="t1" style={{ display: "block" }}>{o.label}</span>
              <span className="t2" style={{ display: "block" }}>
                {o.id === "mark" ? "מנהל התיקים" : o.he}
              </span>
            </span>
          </button>
        ))}
        </div>
        <div className="hint" style={{ marginTop: 18 }}>
          הבחירה נשמרת במכשיר שלכם ואפשר להחליף בכל רגע.
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function DashboardSkeleton() {
 return <div className="shell" role="status" aria-label="טוען נתוני תיק" aria-busy="true">
   <div className="head"><div className="skel skel-head" /><div className="skel skel-head" /></div>
   <div className="page skeleton-page">
     <div className="summary-layout"><div className="card skeleton-summary"><div className="skel skel-label" /><div className="skel skel-total" /><div className="skeleton-kpis"><div className="skel skel-kpi" /><div className="skel skel-kpi" /></div></div><div className="card skeleton-cash"><div className="skel skel-label" /><div className="skel skel-total" /></div></div>
     <div className="card skeleton-panel"><div className="skel skel-label" /><div className="skel skel-chart" /></div>
     <div className="card skeleton-panel"><div className="skel skel-label" /><div className="skel skel-chart" /></div>
     <div className="card skeleton-panel"><div className="skel skel-label" /><div className="skeleton-stock-grid">{[0,1,2].map(i=><div key={i} className="skel skel-stock" />)}</div></div>
   </div>
 </div>;
}

export default function Dashboard() {
  const [data, setData] = useState(EMPTY);
  const [history, setHistory] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState(null);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  useEffect(() => {
    const updateHeader = () => setHeaderScrolled(window.scrollY > 2);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);
  const [ready, setReady] = useState(false);
  const [stateLoading, setStateLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [draft, setDraft] = useState({ ticker: "", qty: "", cost: "" });
  const [openCall, setOpenCall] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [adjust, setAdjust] = useState(null);
  const [research, setResearch] = useState({});
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const refreshBusy = useRef(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const notify = useCallback((message, kind = "success") => {
    clearTimeout(toastTimer.current);
    setToast({ message, kind });
    toastTimer.current = setTimeout(() => setToast(null), 3400);
  }, []);
  useEffect(() => () => { clearTimeout(toastTimer.current); }, []);
  const timer = useRef(null);

  /* ---- identity ---- */
  useEffect(() => {
    try {
      const who = window.localStorage.getItem("fam-me");
      if (who) setMe(who);
    } catch (e) {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    setStateLoading(true);
    setTab(me === "mark" ? "overview" : me);
    (async () => {
      try {
        const res = await fetch(`/api/state?me=${me}`);
        if (!res.ok) throw new Error();
        const j = await res.json();
        if (!cancelled) {
          setData({ ...EMPTY, ...(j.data || {}) });
          setHistory(j.history || []);
        }
      } catch (e) {
        if (!cancelled) setErr("לא הצלחתי לטעון את הנתונים.");
      } finally {
        if (!cancelled) setStateLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [me]);

  const persist = useCallback(
    (next) => {
      setData(next);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        fetch("/api/state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ me, data: next }),
        }).then((res) => { if (!res.ok) throw new Error("save failed"); notify("השינויים נשמרו בהצלחה"); }).catch(() => { setErr("השינוי לא נשמר."); notify("לא הצלחנו לשמור את השינוי", "error"); });
      }, 600);
    },
    [me, notify]
  );

  /* ---- visibility ---- */
  const visible = useMemo(
    () => (me === "mark" ? OWNERS : OWNERS.filter((o) => o.id === me)),
    [me]
  );

  const tickers = useMemo(() => {
    const s = new Set();
    visible.forEach((o) => (data.positions[o.id] || []).forEach((p) => s.add(p.ticker)));
    return [...s];
  }, [data, visible]);

  const refresh = useCallback(async () => {
    if (!tickers.length || refreshBusy.current) return;
    refreshBusy.current = true;
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
      setQuotes((p) => ({ ...p, ...q }));
      const now = new Date();
      setLastUpdated(now);

      const point = { d: isoDay() };
      visible.forEach((o) => {
        point[o.id] = (data.positions[o.id] || []).reduce((s, p) => {
          const px = q[p.ticker] ? q[p.ticker].price : p.cost;
          return s + px * p.qty;
        }, 0);
      });
      setHistory((h) => [...h.filter((x) => x.d !== point.d), point]);
      fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ me, historyPoint: point }),
      }).catch(() => {});
    } catch (e) {
      setErr("לא הצלחתי למשוך מחירים כרגע.");
    } finally {
      refreshBusy.current = false;
      setLoading(false);
    }
  }, [tickers, data, visible, me]);

  useEffect(() => {
    if (!me || !tickers.length) return;
    const id = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 60000);
    return () => clearInterval(id);
  }, [me, tickers.length, refresh]);

  useEffect(() => {
    if (me && tickers.length && !lastUpdated) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, tickers.length]);

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
        [ticker]: { data: d, at: new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) },
      }));
    } catch (e) {
      setResearch((s) => ({ ...s, [ticker]: { error: true } }));
    }
  }, []);

  /* ---- math ---- */
  const rowsOf = useCallback(
    (ownerId) =>
      (data.positions[ownerId] || []).map((p) => {
        const q = quotes[p.ticker];
        const price = q ? q.price : null;
        const basis = p.cost * p.qty;
        const value = price ? price * p.qty : null;
        const pl = value === null ? null : value - basis;
        return {
          ...p,
          owner: ownerId,
          price,
          basis,
          value,
          pl,
          plPct: value === null || !basis ? null : (pl / basis) * 100,
          day: q ? q.change : null,
          dayAbs: value === null || !q ? null : (value * q.change) / 100,
        };
      }),
    [data, quotes]
  );

  const book = (rows, cashOverride, deposits, realized = 0) => {
    const held = rows.reduce((s, r) => s + (r.value ?? r.basis), 0);
    const basis = rows.reduce((s, r) => s + r.basis, 0);
    const day = rows.reduce((s, r) => s + (r.dayAbs || 0), 0);
    /* free cash is derived: what went in, less what is tied up in positions.
       a manual value overrides it — needed after a sale returns money. */
    const manual = cashOverride !== "" && cashOverride !== null && cashOverride !== undefined;
    const cash = manual ? toNum(cashOverride) : deposits + realized - basis;
    const total = held + cash;
    return {
      rows, held, cash, deposits, realized, total, day, basis, manual,
      autoCash: deposits + realized - basis,
      profit: deposits ? total - deposits : held - basis,
      profitPct: deposits ? ((total - deposits) / deposits) * 100 : basis ? ((held - basis) / basis) * 100 : 0,
      dayPct: held ? (day / held) * 100 : 0,
      hasDeposits: deposits > 0,
      dry: total ? (cash / total) * 100 : 0,
    };
  };

  const byOwner = useMemo(() => {
    const m = {};
    visible.forEach((o) => {
      m[o.id] = book(
        rowsOf(o.id),
        data.cash[o.id],
        toNum(data.deposits[o.id]),
        toNum((data.realized || {})[o.id])
      );
    });
    return m;
  }, [visible, rowsOf, data]);

  const allRows = useMemo(() => visible.flatMap((o) => byOwner[o.id]?.rows || []), [visible, byOwner]);

  const grand = useMemo(() => {
    const g = book(
      allRows,
      "",
      visible.reduce((s, o) => s + toNum(data.deposits[o.id]), 0),
      visible.reduce((s, o) => s + toNum((data.realized || {})[o.id]), 0)
    );
    /* each brother may have overridden his own cash, so total it per book */
    const cash = visible.reduce((s, o) => s + (byOwner[o.id]?.cash || 0), 0);
    const total = g.held + cash;
    return {
      ...g,
      cash,
      total,
      profit: g.deposits ? total - g.deposits : g.held - g.basis,
      profitPct: g.deposits
        ? ((total - g.deposits) / g.deposits) * 100
        : g.basis
        ? ((g.held - g.basis) / g.basis) * 100
        : 0,
      dry: total ? (cash / total) * 100 : 0,
    };
  }, [allRows, visible, data, byOwner]);

  /* ---- permissions ---- */
  const canEdit = (owner) => me === "mark" || me === owner;
  const canCall = me === "mark";

  /* ---- mutations ---- */
  const changeMoney = (field, owner, v) =>
    persist({ ...data, [field]: { ...data[field], [owner]: String(v).replace(/[^\d.]/g, "") } });

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
    setModal(null);
  };


  const editPosition = (owner, id, fn) =>
    persist({
      ...data,
      positions: {
        ...data.positions,
        [owner]: data.positions[owner].map((p) => (p.id === id ? fn(p) : p)),
      },
    });

  const buyMore = (owner, id, addQty, addPrice) => {
    setAdjust(null);
    setModal(null);
    editPosition(owner, id, (p) => {
      const qty = p.qty + addQty;
      return { ...p, qty, cost: (p.qty * p.cost + addQty * addPrice) / qty };
    });
  };

  /* A sale frees the cost basis of the sold shares automatically, since basis
     drops. Banking the gross proceeds on top would count that money twice, so
     only the realized gain is stored. */
  const sellSome = (owner, id, sellQty, sellPrice) => {
    setAdjust(null);
    setModal(null);
    const pos = (data.positions[owner] || []).find((p) => p.id === id);
    if (!pos) return;
    const gain = sellQty * (sellPrice - pos.cost);
    const realized = { ...(data.realized || {}) };
    realized[owner] = String(toNum(realized[owner]) + gain);
    const list = data.positions[owner]
      .map((p) => (p.id === id ? { ...p, qty: p.qty - sellQty } : p))
      .filter((p) => p.qty > 0.0000001);
    persist({ ...data, realized, positions: { ...data.positions, [owner]: list } });
  };

  const fixPosition = (owner, id, qty, cost) => {
    setAdjust(null);
    editPosition(owner, id, (p) => ({ ...p, qty, cost }));
  };

  const deletePosition = (owner, id) => {
    setConfirmDel(null);
    setModal(null);
    persist({
      ...data,
      positions: { ...data.positions, [owner]: data.positions[owner].filter((p) => p.id !== id) },
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
                  ? { action, note, date: new Date().toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" }) }
                  : null,
              }
            : p
        ),
      },
    });
  };

  const pickMe = (owner) => {
    try { window.localStorage.setItem("fam-me", owner); } catch (e) {}
    setMe(owner);
  };
  const signOut = () => {
    try { window.localStorage.removeItem("fam-me"); } catch (e) {}
    setMe(null);
    setData(EMPTY);
    setHistory([]);
  };

  /* ---- render ---- */

  if (!ready) return <DashboardSkeleton />;
  if (!me) return <Gate onPick={pickMe} />;
  if (stateLoading) return <DashboardSkeleton />;

  const isOverview = tab === "overview";
  const bk = isOverview ? grand : byOwner[tab] || grand;
  const editableOwners = visible.filter((o) => canEdit(o.id));
  const chartKeys = isOverview ? visible.map((o) => o.id) : [tab];

  const ownerSlices = visible
    .map((o) => ({ name: o.label, value: byOwner[o.id]?.held || 0, color: o.color }))
    .filter((s) => s.value > 0);

  const holdingSlices = (isOverview ? allRows : byOwner[tab]?.rows || [])
    .slice()
    .sort((a, b) => (b.value ?? b.basis) - (a.value ?? a.basis))
    .map((r, i) => ({ name: r.ticker, value: r.value ?? r.basis, color: PALETTE[i % PALETTE.length] }));

  const attention = allRows
    .filter((r) => !r.call || (r.day !== null && Math.abs(r.day) >= 4))
    .slice(0, 6);

  return (
    <div className="shell">
      <div className={`head${headerScrolled ? " head-scrolled" : ""}`}>
        <div>
          <div className="hello"><OwnerAvatar owner={ownerOf(me)} size="small" /> שלום, {ownerOf(me).he}</div>
          <div className="date">
            {todayHe()}

          </div>
        </div>
        <div className="headbtns">
          {editableOwners.length > 0 && <button className="btn pri header-add" onClick={() => setModal({ type: "add", owner: isOverview ? editableOwners[0].id : tab })}><Plus size={17} /> <span>הוספת פוזיציה</span></button>}
          <div className="refresh-chip" title="המחירים מתרעננים אוטומטית בכל דקה"><div className="refresh-status"><span>{loading ? "מעדכן מחירים…" : lastUpdated ? `עודכן ב-${lastUpdated.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}` : "ממתין לעדכון"}</span><small><span className="refresh-dot" /> אוטומטי · כל דקה</small></div><button className="refresh-chip-button" onClick={refresh} disabled={loading} aria-label="רענון מחירים"><RefreshCw size={18} className={loading ? "spin" : ""} /></button></div>
          <button className="icb" onClick={signOut} aria-label="החלפת משתמש">
            <LogOut size={17} />
          </button>
        </div>
      </div>

      <div className="page">
        {err && <div className="banner bad">{err}</div>}

        <div className="summary-layout"><PortfolioSummary book={bk} isOverview={isOverview} /><CashTile cash={bk.cash} onEdit={editableOwners.length ? () => setModal({ type: "cash" }) : null} /></div>

        {!bk.hasDeposits && (
          <div className="banner">
            הזינו כמה כסף הופקד לתיק כדי לראות תשואה אמיתית, ולא רק רווח על הפוזיציות הפתוחות.
          </div>
        )}

        <div className="card">
          <div className="ctitle">שווי לאורך זמן</div>
          <div className="csub">נבנה מתצלום שנשמר בכל רענון. הפקדות אינן נספרות כרווח.</div>
          <TrendChart history={history} keys={chartKeys} />
        </div>

        {isOverview && me === "mark" && ownerSlices.length > 0 && (
          <div className="card">
            <div className="ctitle">חלוקה בין התיקים</div>
            <div className="csub">לפי שווי האחזקות, בלי מזומן</div>
            <Donut slices={ownerSlices} centerValue={usd(grand.held, 0)} centerLabel="מושקע" />
          </div>
        )}

        <div className="card">
          <div className="ctitle">פיזור אחזקות</div>
          <div className="csub">כל {holdingSlices.length} הפוזיציות, לפי שווי</div>
          <Donut
            slices={holdingSlices}
            centerValue={String(holdingSlices.length)}
            centerLabel="פוזיציות"
            expanded
          />
        </div>

        {isOverview && me === "mark" && (
          <div className="card">
            <div className="ctitle">דורש החלטה</div>
            <div className="csub">בלי הוראה, או תנועה חדה היום</div>
            {attention.length === 0 ? (
              <div className="hint">לכל פוזיציה יש הוראה ואין תנועות חריגות.</div>
            ) : (
              attention.map((r) => (
                <div className="row" key={r.id}>
                  <div className="sym">{r.ticker.slice(0, 4)}</div>
                  <div className="grow">
                    <div className="t1" dir="ltr">{r.ticker}</div>
                    <div className="t2">{ownerOf(r.owner).label}</div>
                  </div>
                  <div className="rt">
                    <CallPill call={r.call} />
                    <div className={"b " + tone(r.day)} dir="ltr">
                      {r.day === null ? "—" : pct(r.day)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!isOverview && (
          <section className="card investments-section">
            <h2 className="ctitle investments-heading">ההשקעות שלי</h2>
            {(byOwner[tab]?.rows || []).length === 0 ? (
              <div className="empty">
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>התיק ריק</div>
                <div className="hint">
                  {canEdit(tab)
                    ? "לחצו על ״הוספת פוזיציה״ למעלה כדי להוסיף את המניה הראשונה."
                    : "אין כאן עדיין פוזיציות."}
                </div>
              </div>
            ) : (
              <div className="stock-grid">{byOwner[tab].rows.map((r) => (
                <PositionCard
                  key={r.id}
                  r={r}
                  portfolioTotal={bk.total}
                  canEdit={canEdit(tab)}
                  canCall={canCall}
                  editing={openCall === r.id}
                  adjusting={adjust === r.id}
                  confirming={confirmDel === r.id}
                  research={research[r.ticker]}
                  onOpenCall={setOpenCall}
                  onOpenAdjust={(id) => setModal({ type: "edit", row: r })}
                  onCancelAdjust={() => setModal(null)}
                  onBuy={buyMore}
                  onSell={sellSome}
                  onFix={fixPosition}
                  onSaveCall={saveCall}
                  onCancelCall={() => setOpenCall(null)}
                  onAskDelete={(id) => setModal({ type: "delete", row: r })}
                  onCancelDelete={() => setConfirmDel(null)}
                  onDelete={deletePosition}
                  onResearch={(ticker) => { setModal({ type: "research", ticker }); runResearch(ticker); }}
                  onCloseResearch={() => setModal(null)}
                />
              ))}</div>
            )}
          </section>
        )}

        <div className="foot">
          מחירים מ-Yahoo Finance, מתעכבים בדרך כלל ברבע שעה — למעקב, לא לביצוע עסקאות.
          {me !== "mark" && " התיקים של האחים האחרים אינם נטענים למכשיר שלך."}
          {" "}הכלי לא מהווה ייעוץ השקעות.
        </div>
      </div>

      {toast && <div className={"app-toast " + (toast.kind === "error" ? "app-toast-error" : "")} role="status">{toast.kind === "error" ? <AlertTriangle size={19} /> : <CircleCheck size={19} />}<span>{toast.message}</span><button onClick={() => setToast(null)} aria-label="סגירה"><X size={15} /></button></div>}
      {modal?.type === "delete" && <Modal title={`מחיקת ${modal.row.ticker}`} onClose={() => setModal(null)}><div className="delete-dialog"><div className="delete-dialog-icon"><Trash2 size={24} /></div><p>למחוק את הפוזיציה <strong dir="ltr">{modal.row.ticker}</strong> מהתיק?</p><span>הפעולה תסיר את המניה מהתיק ולא ניתן לבטל אותה.</span><div className="delete-dialog-actions"><button className="btn" onClick={() => setModal(null)}>ביטול</button><button className="btn dg" onClick={() => deletePosition(modal.row.owner, modal.row.id)}><Trash2 size={16} /> מחיקת פוזיציה</button></div></div></Modal>}
      {modal?.type === "cash" && <Modal title="עריכת מזומן פנוי להשקעה" onClose={() => setModal(null)}><MoneyEditor data={data} owners={isOverview ? editableOwners : [ownerOf(tab)]} books={byOwner} onChange={changeMoney} /></Modal>}
      {modal?.type === "add" && <Modal title="הוספת פוזיציה" onClose={() => setModal(null)}><div className="modal-owner">{editableOwners.length > 1 && <select className="inp" value={modal.owner} onChange={e => setModal({ ...modal, owner: e.target.value })}>{editableOwners.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select>}</div><AddPosition draft={draft} setDraft={setDraft} onAdd={() => addPosition(modal.owner)} /></Modal>}
      {modal?.type === "edit" && <Modal title={`עריכת ${modal.row.ticker}`} onClose={() => setModal(null)}><PositionEditor row={modal.row} onBuy={(q,p) => buyMore(modal.row.owner,modal.row.id,q,p)} onSell={(q,p) => sellSome(modal.row.owner,modal.row.id,q,p)} onFix={(q,c) => { fixPosition(modal.row.owner,modal.row.id,q,c); setModal(null); }} onCancel={() => setModal(null)} /></Modal>}
      {modal?.type === "research" && <Modal title={`ניתוח ${modal.ticker}`} onClose={() => setModal(null)}><Research ticker={modal.ticker} price={quotes[modal.ticker]?.price} entry={research[modal.ticker]} onRun={() => runResearch(modal.ticker)} onClose={() => setModal(null)} /></Modal>}
      {me === "mark" && (
        <nav className="nav">
          <button data-on={isOverview ? 1 : 0} onClick={() => { setTab("overview"); }}>
            <LayoutGrid size={19} />
            סקירה
          </button>
          {OWNERS.map((o) => (
            <button key={o.id} data-on={tab === o.id ? 1 : 0} onClick={() => { setTab(o.id); }}>
              <OwnerAvatar owner={o} size="small" />
              {o.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
