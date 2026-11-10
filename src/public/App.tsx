import { useEffect, useMemo, useRef, useState } from "react";
import { fetchPublishedEntries, fetchSettings } from "../lib/data";
import { DEFAULT_SETTINGS, STAGES, stageInfo, type MisoEntry, type MisoSettings, type Photo } from "../lib/types";
import { daysBetween, formatDot, formatJa, todayJST } from "../lib/date";

export default function App() {
  const [settings, setSettings] = useState<MisoSettings>(DEFAULT_SETTINGS);
  const [entries, setEntries] = useState<MisoEntry[] | null>(null);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV && location.search.includes("demo")) {
      import("./demo").then((m) => { setSettings(m.demoSettings); setEntries(m.demoEntries); });
      return;
    }
    fetchSettings().then(setSettings).catch(() => undefined);
    fetchPublishedEntries()
      .then(setEntries)
      .catch((e) => { console.error(e); setError("記録を読み込めませんでした"); setEntries([]); });
  }, []);

  const startDate = settings.startDate || entries?.find((e) => e.stage === "shikomi")?.date || "";
  const currentStage = useMemo(() => {
    if (!entries?.length) return "shikomi";
    if (entries.some((e) => e.stage === "kansei")) return "kansei";
    if (entries.some((e) => e.stage === "jukusei")) return "jukusei";
    return "shikomi";
  }, [entries]);

  useReveal([entries]);

  return (
    <div className="site">
      <Hero settings={settings} startDate={startDate} stage={currentStage} />
      <Ingredients settings={settings} />
      <section className="process" id="process">
        <header className="section-head reveal">
          <span className="section-no">参</span>
          <h2>工程</h2>
          <p className="section-en">Process</p>
        </header>
        <StageRail current={currentStage} />
        {entries === null && <p className="muted center">読み込み中…</p>}
        {error && <p className="muted center">{error}</p>}
        {entries && entries.length === 0 && !error && (
          <p className="muted center empty">まだ記録はありません。仕込みの日を、静かに待っています。</p>
        )}
        {entries && entries.length > 0 && (
          <Timeline entries={entries} startDate={startDate} onPhoto={setLightbox} />
        )}
      </section>
      <footer className="foot">
        <div className="foot-mark">味</div>
        <p>手前味噌 — homemade miso journal</p>
        <p className="muted small">米麹・大豆・塩 / 時間</p>
      </footer>
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)} role="dialog" aria-label="写真">
          <img src={lightbox.url} alt="" />
        </div>
      )}
    </div>
  );
}

function Hero({ settings, startDate, stage }: { settings: MisoSettings; startDate: string; stage: string }) {
  const today = todayJST();
  const days = startDate ? daysBetween(startDate, today) : null;
  const targetDays = Math.round((settings.targetMonths || 10) * 30.4);
  const progress = days !== null ? Math.max(0, Math.min(1, days / targetDays)) : 0;
  const started = days !== null && days >= 0;
  return (
    <section className="hero">
      <div className="hero-grain" aria-hidden />
      <div className="hero-inner">
        <h1 className="hero-title" aria-label={settings.title}>
          {settings.title.split("").map((c, i) => <span key={i} style={{ animationDelay: `${0.15 * i}s` }}>{c}</span>)}
        </h1>
        <div className="hero-side">
          <p className="hero-sub">{settings.subtitle}</p>
          <div className="seal" aria-hidden>
            <span>{stageInfo(stage as never).ja}</span>
          </div>
        </div>
      </div>
      <div className="hero-counter">
        {started ? (
          <>
            <p className="counter-label">仕込みから</p>
            <p className="counter-num">
              <span className="kan">第</span>
              <span className="num">{days}</span>
              <span className="kan">日</span>
            </p>
            <p className="counter-sub">
              {formatJa(startDate)} 仕込み ・ 熟成目安 {settings.targetMonths}ヶ月
            </p>
            <div className="progress" aria-label={`熟成の目安まで ${Math.round(progress * 100)}%`}>
              <div className="progress-bar" style={{ width: `${progress * 100}%` }} />
            </div>
          </>
        ) : (
          <>
            <p className="counter-label">仕込み</p>
            <p className="counter-num"><span className="kan">{startDate ? formatJa(startDate) : "近日"}</span></p>
          </>
        )}
      </div>
      <a className="scroll-cue" href="#materials" aria-label="下へ">
        <span>scroll</span>
      </a>
    </section>
  );
}

function Ingredients({ settings }: { settings: MisoSettings }) {
  const list = settings.ingredients;
  const total = list.reduce((s, i) => s + (i.grams || 0), 0) || 1;
  const soy = list.find((i) => i.name.includes("大豆"))?.grams ?? 0;
  const koji = list.find((i) => i.name.includes("麹"))?.grams ?? 0;
  const salt = list.find((i) => i.name.includes("塩"))?.grams ?? 0;
  const kojiBuai = soy ? koji / soy : 0;
  return (
    <section className="materials" id="materials">
      <header className="section-head reveal">
        <span className="section-no">壱</span>
        <h2>素材</h2>
        <p className="section-en">Ingredients</p>
      </header>
      {settings.intro && <p className="intro reveal">{settings.intro}</p>}
      <div className="mat-grid">
        {list.map((ing, i) => (
          <article className="mat reveal" key={i} style={{ transitionDelay: `${i * 0.12}s` }}>
            <div className="mat-kanji">{ing.name}</div>
            <div className="mat-grams">
              <span className="num">{ing.grams.toLocaleString()}</span><span className="unit">g</span>
            </div>
            <div className="mat-bar"><div style={{ width: `${(ing.grams / total) * 100}%` }} /></div>
            <div className="mat-pct">{((ing.grams / total) * 100).toFixed(1)}%</div>
            {ing.note && <p className="mat-note">{ing.note}</p>}
          </article>
        ))}
      </div>
      <div className="ratio reveal">
        <header className="section-head small">
          <span className="section-no">弐</span>
          <h3>配合</h3>
        </header>
        <dl>
          {soy > 0 && koji > 0 && (
            <div><dt>麹歩合</dt><dd>{(kojiBuai * 10).toFixed(1).replace(/\.0$/, "")}<small>割</small></dd></div>
          )}
          {salt > 0 && (
            <div><dt>塩分（乾燥重量比）</dt><dd>{((salt / total) * 100).toFixed(1)}<small>%</small></dd></div>
          )}
          <div><dt>総量（仕込み前）</dt><dd>{(total / 1000).toFixed(2)}<small>kg</small></dd></div>
        </dl>
      </div>
    </section>
  );
}

function StageRail({ current }: { current: string }) {
  const idx = STAGES.findIndex((s) => s.key === current);
  return (
    <ol className="stage-rail reveal">
      {STAGES.map((s, i) => (
        <li key={s.key} className={i < idx ? "done" : i === idx ? "now" : ""}>
          <span className="dot" />
          <span className="ja">{s.ja}</span>
          <span className="en">{s.en}</span>
        </li>
      ))}
    </ol>
  );
}

function Timeline({ entries, startDate, onPhoto }: { entries: MisoEntry[]; startDate: string; onPhoto: (p: Photo) => void }) {
  let lastStage = "";
  return (
    <ol className="timeline">
      {entries.map((e) => {
        const showStage = e.stage !== lastStage;
        lastStage = e.stage;
        const info = stageInfo(e.stage);
        const day = startDate ? daysBetween(startDate, e.date) : null;
        return (
          <li key={e.id} className={`tl-item stage-${e.stage}`}>
            {showStage && (
              <div className="tl-stage reveal">
                <span className="ja">{info.ja}</span>
                <span className="en">{info.en}</span>
              </div>
            )}
            <article className="tl-card reveal">
              <div className="tl-meta">
                <time dateTime={e.date}>{formatDot(e.date)}</time>
                {day !== null && day >= 0 && <span className="tl-day">第{day}日</span>}
              </div>
              {e.title && <h3 className="tl-title">{e.title}</h3>}
              {e.body && <p className="tl-body">{e.body}</p>}
              {e.photos?.length > 0 && (
                <div className={`tl-photos n${Math.min(e.photos.length, 4)}`}>
                  {e.photos.map((p) => (
                    <button key={p.path} className="tl-photo" onClick={() => onPhoto(p)} aria-label="写真を拡大">
                      <img src={p.url} alt="" loading="lazy" width={p.w} height={p.h} />
                    </button>
                  ))}
                </div>
              )}
            </article>
          </li>
        );
      })}
    </ol>
  );
}

function useReveal(deps: unknown[]) {
  const io = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    io.current?.disconnect();
    io.current = new IntersectionObserver(
      (items) => items.forEach((it) => { if (it.isIntersecting) { it.target.classList.add("in"); io.current?.unobserve(it.target); } }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    document.querySelectorAll(".reveal:not(.in)").forEach((el) => io.current!.observe(el));
    return () => io.current?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
