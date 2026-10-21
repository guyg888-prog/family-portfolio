function PositionCard(props) {
  const { r, edit, canEdit, canCall, editing, adjusting, confirming, research } = props;
  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div className="sym">{r.ticker.slice(0, 4)}</div>
        <div className="grow">
          <div className="t1" dir="ltr">{r.ticker}</div>
          <div className="t2" dir="ltr">{r.qty} × {usd(r.cost)}</div>
        </div>
        <div className="rt">
          <div className="a" dir="ltr">{r.value === null ? "—" : usd(r.value)}</div>
          <div className={"b " + tone(r.plPct)} dir="ltr">
            {r.plPct === null ? "ממתין למחיר" : `${usd(r.pl, 0)} · ${pct(r.plPct)}`}
          </div>
        </div>
      </div>

      {r.call && !editing && (
        <div className="note">
          <div className="notehead">
            <CallPill call={r.call} />
            <span className="notemeta">מארק · {r.call.date}</span>
          </div>
          {r.call.note && <div className="notetxt">{r.call.note}</div>}
        </div>
      )}

      {!editing && !adjusting && (
        <Research
          ticker={r.ticker}
          price={r.price}
          entry={research}
          onRun={() => props.onResearch(r.ticker)}
          onClose={() => props.onCloseResearch(r.ticker)}
        />
      )}

      {canEdit && !editing && !adjusting && (
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <span style={{ display: "flex", gap: 8 }}>
            <button className="btn sm" onClick={() => props.onOpenAdjust(r.id)}>
              עדכון פוזיציה
            </button>
            {canCall && (
              <button className="btn sm" onClick={() => props.onOpenCall(r.id)}>
                {r.call ? "עריכת הוראה" : "הוראה"}
              </button>
            )}
          </span>
          {confirming ? (
            <span style={{ display: "flex", gap: 6 }}>
              <button className="btn sm dg" onClick={() => props.onDelete(r.owner, r.id)}>לאשר</button>
              <button className="btn sm" onClick={props.onCancelDelete}>ביטול</button>
            </span>
          ) : (
            <button className="btn sm dg" onClick={() => props.onAskDelete(r.id)} aria-label="מחיקה">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      )}

      {canEdit && adjusting && (
        <PositionEditor
          row={r}
          onBuy={(q, p) => props.onBuy(r.owner, r.id, q, p)}
          onSell={(q, p) => props.onSell(r.owner, r.id, q, p)}
          onFix={(q, c) => props.onFix(r.owner, r.id, q, c)}
          onCancel={props.onCancelAdjust}
        />
      )}

      {canCall && editing && (
        <CallEditor
          init={r.call}
          onSave={(a, n) => props.onSaveCall(r.owner, r.id, a, n)}
          onClear={() => props.onSaveCall(r.owner, r.id, null, "")}
          onCancel={props.onCancelCall}
        />
      )}
    </div>
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
        {OWNERS.map((o) => (
          <button key={o.id} className="pick" onClick={() => onPick(o.id)}>
            <span className="av" style={{ background: o.color }}>{o.label[0]}</span>
            <span className="grow">
              <span className="t1" style={{ display: "block" }}>{o.label}</span>
              <span className="t2" style={{ display: "block" }}>
                {o.id === "mark" ? "מנהל התיקים" : o.he}
              </span>
            </span>
          </button>
        ))}
        <div className="hint" style={{ marginTop: 18 }}>
          הבחירה נשמרת במכשיר שלכם ואפשר להחליף בכל רגע.
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const [data, setData] = useState(EMPTY);
  const [history, setHistory] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState(null);
  const [edit, setEdit] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [stamp, setStamp] = useState(null);
  const [draft, setDraft] = useState({ ticker: "", qty: "", cost: "" });
  const [openCall, setOpenCall] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [adjust, setAdjust] = useState(null);
  const [research, setResearch] = useState({});
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
    setTab(me === "mark" ? "overview" : me);
    (async () => {
      try {
        const res = await fetch(`/api/state?me=${me}`);
        if (!res.ok) throw new Error();
        const j = await res.json();
        setData({ ...EMPTY, ...(j.data || {}) });
        setHistory(j.history || []);
      } catch (e) {
        setErr("לא הצלחתי לטעון את הנתונים.");
      }
    })();
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
        }).catch(() => setErr("השינוי לא נשמר."));
      }, 600);
    },
    [me]
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
      setQuotes((p) => ({ ...p, ...q }));
      setStamp(new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }));

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
      setLoading(false);
    }
  }, [tickers, data, visible, me]);

  useEffect(() => {
    if (me && tickers.length && !stamp) refresh();
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
    setEdit(false);
  };

  /* ---- render ---- */

  if (!ready) return <div className="gate"><span className="hint">טוען…</span></div>;
  if (!me) return <Gate onPick={pickMe} />;

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
      <div className="head">
        <div>
          <div className="hello">שלום, {ownerOf(me).he}</div>
          <div className="date">
            {todayHe()}
            {stamp ? ` · עודכן ${stamp}` : ""}
          </div>
        </div>
        <div className="headbtns">
          <button className="icb" onClick={refresh} disabled={loading} aria-label="רענון">
            <RefreshCw size={18} className={loading ? "spin" : ""} />
          </button>
          {(isOverview ? editableOwners.length > 0 : canEdit(tab)) && (
            <button
              className="icb"
              data-on={edit ? 1 : 0}
              onClick={() => { setEdit((e) => !e); setOpenCall(null); setConfirmDel(null); }}
              aria-label="עריכה"
            >
              {edit ? <Check size={18} /> : <Pencil size={17} />}
            </button>
          )}
          <button className="icb" onClick={signOut} aria-label="החלפת משתמש">
            <LogOut size={17} />
          </button>
        </div>
      </div>

      <div className="page">
        {err && <div className="banner bad">{err}</div>}

        <PortfolioSummary book={bk} isOverview={isOverview} />

        {!bk.hasDeposits && (
          <div className="banner">
            הזינו כמה כסף הופקד לתיק כדי לראות תשואה אמיתית, ולא רק רווח על הפוזיציות הפתוחות.
          </div>
        )}

        {edit && (
          <MoneyEditor
            data={data}
            owners={isOverview ? editableOwners : [ownerOf(tab)]}
            books={byOwner}
            onChange={changeMoney}
          />
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
          <>
            {edit && canEdit(tab) && (
              <AddPosition
                draft={draft}
                setDraft={setDraft}
                onAdd={() => addPosition(tab)}
                ownerHe={me === "mark" ? ownerOf(tab).he : ""}
              />
            )}

            {(byOwner[tab]?.rows || []).length === 0 ? (
              <div className="empty">
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>התיק ריק</div>
                <div className="hint">
                  {canEdit(tab)
                    ? "לחצו על כפתור העריכה למעלה כדי להוסיף את המניה הראשונה."
                    : "אין כאן עדיין פוזיציות."}
                </div>
              </div>
            ) : (
              <div className="stock-grid">{byOwner[tab].rows.map((r) => (
                <PositionCard
                  key={r.id}
                  r={r}
                  portfolioTotal={bk.total}
                  edit={edit}
                  canEdit={canEdit(tab)}
                  canCall={canCall}
                  editing={openCall === r.id}
                  adjusting={adjust === r.id}
                  confirming={confirmDel === r.id}
                  research={research[r.ticker]}
                  onOpenCall={setOpenCall}
                  onOpenAdjust={setAdjust}
                  onCancelAdjust={() => setAdjust(null)}
                  onBuy={buyMore}
                  onSell={sellSome}
                  onFix={fixPosition}
                  onSaveCall={saveCall}
                  onCancelCall={() => setOpenCall(null)}
                  onAskDelete={setConfirmDel}
                  onCancelDelete={() => setConfirmDel(null)}
                  onDelete={deletePosition}
                  onResearch={runResearch}
                  onCloseResearch={(t) =>
                    setResearch((s) => { const n = { ...s }; delete n[t]; return n; })
                  }
                />
              ))}</div>
            )}
          </>
        )}

        <div className="foot">
          מחירים מ-Yahoo Finance, מתעכבים בדרך כלל ברבע שעה — למעקב, לא לביצוע עסקאות.
          {me !== "mark" && " התיקים של האחים האחרים אינם נטענים למכשיר שלך."}
          {" "}הכלי לא מהווה ייעוץ השקעות.
        </div>
      </div>

      {me === "mark" && (
        <nav className="nav">
          <button data-on={isOverview ? 1 : 0} onClick={() => { setTab("overview"); setEdit(false); }}>
            <LayoutGrid size={19} />
            סקירה
          </button>
          {OWNERS.map((o) => (
            <button key={o.id} data-on={tab === o.id ? 1 : 0} onClick={() => { setTab(o.id); setEdit(false); }}>
              <Wallet size={19} />
              {o.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
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
          <div className="stock-name">מחיר מניה</div>
        </div>
        <div className="stock-price">
          <strong dir="ltr">{r.price === null ? "—" : usd(r.price)}</strong>
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
          <span>שינוי יומי</span>
          <strong className={tone(dayMoney)} dir="ltr">
            {dayMoney === null ? "—" : `${dayMoney > 0 ? "+" : ""}${usd(dayMoney)} · ${pct(r.day)}`}
          </strong>
        </div>
        <div>
          <span>שינוי ממועד הקנייה</span>
          <strong className={tone(r.pl)} dir="ltr">
            {r.pl === null ? "—" : `${r.pl > 0 ? "+" : ""}${usd(r.pl)} · ${pct(r.plPct)}`}
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
        <Research ticker={r.ticker} price={r.price} entry={research}
          onRun={() => props.onResearch(r.ticker)}
          onClose={() => props.onCloseResearch(r.ticker)} />
      )}

      {canEdit && !editing && !adjusting && (
        <div className="stock-actions">
          <button className="btn sm" onClick={() => props.onOpenAdjust(r.id)}>עריכת מניה</button>
          {canCall && (
            <button className="btn sm" onClick={() => props.onOpenCall(r.id)}>
              {r.call ? "עריכת הוראה" : "הוראה"}
            </button>
          )}
          {confirming ? (
            <>
              <button className="btn sm dg" onClick={() => props.onDelete(r.owner, r.id)}>לאשר מחיקה</button>
              <button className="btn sm" onClick={props.onCancelDelete}>ביטול</button>
            </>
          ) : (
            <button className="btn sm dg" onClick={() => props.onAskDelete(r.id)} aria-label="מחיקה">
              <Trash2 size={15} />
            </button>
          )}
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
        {OWNERS.map((o) => (
          <button key={o.id} className="pick" onClick={() => onPick(o.id)}>
            <span className="av" style={{ background: o.color }}>{o.label[0]}</span>
            <span className="grow">
              <span className="t1" style={{ display: "block" }}>{o.label}</span>
              <span className="t2" style={{ display: "block" }}>
                {o.id === "mark" ? "מנהל התיקים" : o.he}
              </span>
            </span>
          </button>
        ))}
        <div className="hint" style={{ marginTop: 18 }}>
          הבחירה נשמרת במכשיר שלכם ואפשר להחליף בכל רגע.
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const [data, setData] = useState(EMPTY);
  const [history, setHistory] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState(null);
  const [edit, setEdit] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [stamp, setStamp] = useState(null);
  const [draft, setDraft] = useState({ ticker: "", qty: "", cost: "" });
  const [openCall, setOpenCall] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [adjust, setAdjust] = useState(null);
  const [research, setResearch] = useState({});
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
    setTab(me === "mark" ? "overview" : me);
    (async () => {
      try {
        const res = await fetch(`/api/state?me=${me}`);
        if (!res.ok) throw new Error();
        const j = await res.json();
        setData({ ...EMPTY, ...(j.data || {}) });
        setHistory(j.history || []);
      } catch (e) {
        setErr("לא הצלחתי לטעון את הנתונים.");
      }
    })();
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
        }).catch(() => setErr("השינוי לא נשמר."));
      }, 600);
    },
    [me]
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
      setQuotes((p) => ({ ...p, ...q }));
      setStamp(new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }));

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
      setLoading(false);
    }
  }, [tickers, data, visible, me]);

  useEffect(() => {
    if (me && tickers.length && !stamp) refresh();
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
    setEdit(false);
  };

  /* ---- render ---- */

  if (!ready) return <div className="gate"><span className="hint">טוען…</span></div>;
  if (!me) return <Gate onPick={pickMe} />;

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
      <div className="head">
        <div>
          <div className="hello">שלום, {ownerOf(me).he}</div>
          <div className="date">
            {todayHe()}
            {stamp ? ` · עודכן ${stamp}` : ""}
          </div>
        </div>
        <div className="headbtns">
          <button className="icb" onClick={refresh} disabled={loading} aria-label="רענון">
            <RefreshCw size={18} className={loading ? "spin" : ""} />
          </button>
          {(isOverview ? editableOwners.length > 0 : canEdit(tab)) && (
            <button
              className="icb"
              data-on={edit ? 1 : 0}
              onClick={() => { setEdit((e) => !e); setOpenCall(null); setConfirmDel(null); }}
              aria-label="עריכה"
            >
              {edit ? <Check size={18} /> : <Pencil size={17} />}
            </button>
          )}
          <button className="icb" onClick={signOut} aria-label="החלפת משתמש">
            <LogOut size={17} />
          </button>
        </div>
      </div>

      <div className="page">
        {err && <div className="banner bad">{err}</div>}

        <PortfolioSummary book={bk} isOverview={isOverview} />

        {!bk.hasDeposits && (
          <div className="banner">
            הזינו כמה כסף הופקד לתיק כדי לראות תשואה אמיתית, ולא רק רווח על הפוזיציות הפתוחות.
          </div>
        )}

        {edit && (
          <MoneyEditor
            data={data}
            owners={isOverview ? editableOwners : [ownerOf(tab)]}
            books={byOwner}
            onChange={changeMoney}
          />
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
          <>
            {edit && canEdit(tab) && (
              <AddPosition
                draft={draft}
                setDraft={setDraft}
                onAdd={() => addPosition(tab)}
                ownerHe={me === "mark" ? ownerOf(tab).he : ""}
              />
            )}

            {(byOwner[tab]?.rows || []).length === 0 ? (
              <div className="empty">
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>התיק ריק</div>
                <div className="hint">
                  {canEdit(tab)
                    ? "לחצו על כפתור העריכה למעלה כדי להוסיף את המניה הראשונה."
                    : "אין כאן עדיין פוזיציות."}
                </div>
              </div>
            ) : (
              byOwner[tab].rows.map((r) => (
                <PositionCard
                  key={r.id}
                  r={r}
                  edit={edit}
                  canEdit={canEdit(tab)}
                  canCall={canCall}
                  editing={openCall === r.id}
                  adjusting={adjust === r.id}
                  confirming={confirmDel === r.id}
                  research={research[r.ticker]}
                  onOpenCall={setOpenCall}
                  onOpenAdjust={setAdjust}
                  onCancelAdjust={() => setAdjust(null)}
                  onBuy={buyMore}
                  onSell={sellSome}
                  onFix={fixPosition}
                  onSaveCall={saveCall}
                  onCancelCall={() => setOpenCall(null)}
                  onAskDelete={setConfirmDel}
                  onCancelDelete={() => setConfirmDel(null)}
                  onDelete={deletePosition}
                  onResearch={runResearch}
                  onCloseResearch={(t) =>
                    setResearch((s) => { const n = { ...s }; delete n[t]; return n; })
                  }
                />
              ))
            )}
          </>
        )}

        <div className="foot">
          מחירים מ-Yahoo Finance, מתעכבים בדרך כלל ברבע שעה — למעקב, לא לביצוע עסקאות.
          {me !== "mark" && " התיקים של האחים האחרים אינם נטענים למכשיר שלך."}
          {" "}הכלי לא מהווה ייעוץ השקעות.
        </div>
      </div>

      {me === "mark" && (
        <nav className="nav">
          <button data-on={isOverview ? 1 : 0} onClick={() => { setTab("overview"); setEdit(false); }}>
            <LayoutGrid size={19} />
            סקירה
          </button>
          {OWNERS.map((o) => (
            <button key={o.id} data-on={tab === o.id ? 1 : 0} onClick={() => { setTab(o.id); setEdit(false); }}>
              <Wallet size={19} />
              {o.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
