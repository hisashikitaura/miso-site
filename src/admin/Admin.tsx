import { useEffect, useState } from "react";
import {
  GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User,
} from "firebase/auth";
import { auth } from "../lib/firebase-admin";
import { fetchSettings } from "../lib/data";
import {
  createEntry, deleteEntry, deletePhoto, fetchAllEntries, probeOwner, saveSettings,
  updateEntry, uploadPhoto, type EntryInput,
} from "../lib/data-admin";
import { resizeImage } from "../lib/resize";
import { DEFAULT_SETTINGS, STAGES, stageInfo, type MisoEntry, type MisoSettings, type Photo, type Stage } from "../lib/types";
import { formatDot, todayJST } from "../lib/date";

type AuthState = { status: "loading" } | { status: "out" } | { status: "denied"; user: User } | { status: "owner"; user: User };

export default function Admin() {
  const [st, setSt] = useState<AuthState>({ status: "loading" });
  const [err, setErr] = useState("");

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    if (!u) return setSt({ status: "out" });
    setSt({ status: "loading" });
    setSt((await probeOwner()) ? { status: "owner", user: u } : { status: "denied", user: u });
  }), []);

  const login = async () => {
    setErr("");
    const p = new GoogleAuthProvider();
    p.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(auth, p);
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
        await signInWithRedirect(auth, p);
      } else if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setErr(`ログインに失敗しました（${code || String(e)}）`);
      }
    }
  };

  if (st.status === "loading") return <Shell><p className="muted center pad">確認中…</p></Shell>;
  if (st.status === "out")
    return (
      <Shell>
        <div className="login">
          <div className="login-mark">味</div>
          <h1>味噌の記録 管理</h1>
          <p className="muted">オーナーのみ投稿できます</p>
          <button className="btn primary lg" onClick={login}>Google でログイン</button>
          {err && <p className="error">{err}</p>}
          <a className="link" href="/">← サイトを見る</a>
        </div>
      </Shell>
    );
  if (st.status === "denied")
    return (
      <Shell>
        <div className="login">
          <h1>権限がありません</h1>
          <p className="muted">このアカウントでは投稿できません。</p>
          <button className="btn" onClick={() => signOut(auth)}>ログアウト</button>
          <a className="link" href="/">← サイトを見る</a>
        </div>
      </Shell>
    );
  return <Dashboard />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="admin">{children}</div>;
}

function Dashboard() {
  const [tab, setTab] = useState<"entries" | "settings">("entries");
  const [entries, setEntries] = useState<MisoEntry[]>([]);
  const [editing, setEditing] = useState<MisoEntry | "new" | null>(null);
  const [toast, setToast] = useState("");

  const reload = () => fetchAllEntries().then(setEntries).catch((e) => setToast(`読み込み失敗: ${e.message}`));
  useEffect(() => { reload(); }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 2600); return () => clearTimeout(t); } }, [toast]);

  return (
    <Shell>
      <header className="bar">
        <a href="/" className="bar-brand"><span className="mark">味</span>管理</a>
        <nav className="tabs">
          <button className={tab === "entries" ? "on" : ""} onClick={() => setTab("entries")}>記録</button>
          <button className={tab === "settings" ? "on" : ""} onClick={() => setTab("settings")}>設定</button>
        </nav>
        <button className="btn ghost sm" onClick={() => signOut(auth)}>ログアウト</button>
      </header>

      {tab === "entries" && !editing && (
        <main className="main">
          <button className="btn primary block" onClick={() => setEditing("new")}>＋ 新しい記録</button>
          {entries.length === 0 && <p className="muted center pad">まだ記録がありません</p>}
          <ul className="entry-list">
            {[...entries].reverse().map((e) => (
              <li key={e.id} className="entry-row" onClick={() => setEditing(e)}>
                {e.photos[0] ? <img src={e.photos[0].url} alt="" /> : <div className="noimg">{stageInfo(e.stage).ja[0]}</div>}
                <div className="entry-txt">
                  <div className="entry-meta">
                    <span className={`chip stage-${e.stage}`}>{stageInfo(e.stage).ja}</span>
                    <span>{formatDot(e.date)}</span>
                    {!e.published && <span className="chip draft">下書き</span>}
                  </div>
                  <div className="entry-title">{e.title || "（無題）"}</div>
                </div>
              </li>
            ))}
          </ul>
        </main>
      )}

      {tab === "entries" && editing && (
        <EntryEditor
          entry={editing === "new" ? null : editing}
          onDone={(msg) => { setEditing(null); if (msg) setToast(msg); reload(); }}
        />
      )}

      {tab === "settings" && <SettingsEditor onSaved={() => setToast("設定を保存しました")} />}
      {toast && <div className="toast">{toast}</div>}
    </Shell>
  );
}

type Pending = { key: string; file: File; preview: string };

function EntryEditor({ entry, onDone }: { entry: MisoEntry | null; onDone: (msg?: string) => void }) {
  const [stage, setStage] = useState<Stage>(entry?.stage ?? "jukusei");
  const [date, setDate] = useState(entry?.date ?? todayJST());
  const [title, setTitle] = useState(entry?.title ?? "");
  const [body, setBody] = useState(entry?.body ?? "");
  const [published, setPublished] = useState(entry?.published ?? true);
  const [photos, setPhotos] = useState<Photo[]>(entry?.photos ?? []);
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => () => pending.forEach((p) => URL.revokeObjectURL(p.preview)), []); // eslint-disable-line

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).slice(0, 12 - photos.length - pending.length).map((f) => ({
      key: `${f.name}-${f.size}-${Math.random()}`, file: f, preview: URL.createObjectURL(f),
    }));
    setPending((p) => [...p, ...list]);
  };

  const move = (i: number, d: -1 | 1) => setPhotos((ps) => {
    const n = [...ps]; const j = i + d; if (j < 0 || j >= n.length) return ps;
    [n[i], n[j]] = [n[j], n[i]]; return n;
  });

  const save = async () => {
    setErr("");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setErr("日付を入力してください");
    try {
      const uploaded: Photo[] = [];
      for (let i = 0; i < pending.length; i++) {
        setBusy(`写真をアップロード中 ${i + 1}/${pending.length}`);
        const { blob, w, h } = await resizeImage(pending[i].file);
        uploaded.push(await uploadPhoto(blob, w, h));
      }
      setBusy("保存中…");
      const data: EntryInput = { stage, date, title: title.trim(), body: body.trim(), published, photos: [...photos, ...uploaded] };
      if (entry) await updateEntry(entry.id, data);
      else await createEntry(data);
      const removed = (entry?.photos ?? []).filter((p) => !photos.some((q) => q.path === p.path));
      await Promise.all(removed.map((p) => deletePhoto(p).catch(() => undefined)));
      onDone(entry ? "更新しました" : "投稿しました");
    } catch (e) {
      setErr(`保存できませんでした: ${(e as Error).message}`);
    } finally {
      setBusy("");
    }
  };

  const remove = async () => {
    if (!entry || !confirm("この記録を削除しますか？（写真も削除されます）")) return;
    setBusy("削除中…");
    try { await deleteEntry(entry); onDone("削除しました"); }
    catch (e) { setErr(`削除できませんでした: ${(e as Error).message}`); setBusy(""); }
  };

  return (
    <main className="main editor">
      <div className="editor-head">
        <button className="btn ghost sm" onClick={() => onDone()} disabled={!!busy}>← 戻る</button>
        <h2>{entry ? "記録を編集" : "新しい記録"}</h2>
      </div>

      <label className="field">
        <span>段階</span>
        <div className="seg">
          {STAGES.map((s) => (
            <button key={s.key} type="button" className={stage === s.key ? "on" : ""} onClick={() => setStage(s.key)}>{s.ja}</button>
          ))}
        </div>
      </label>

      <label className="field">
        <span>日付</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>

      <label className="field">
        <span>見出し</span>
        <input type="text" value={title} maxLength={200} placeholder="例：天地返し、カビなし" onChange={(e) => setTitle(e.target.value)} />
      </label>

      <label className="field">
        <span>本文</span>
        <textarea rows={7} value={body} maxLength={20000} placeholder="色・香り・気温・作業メモなど" onChange={(e) => setBody(e.target.value)} />
      </label>

      <div className="field">
        <span>写真（最大12枚・自動で縮小）</span>
        <div className="thumbs">
          {photos.map((p, i) => (
            <div className="thumb" key={p.path}>
              <img src={p.url} alt="" />
              <div className="thumb-ops">
                <button type="button" onClick={() => move(i, -1)} aria-label="前へ">‹</button>
                <button type="button" onClick={() => setPhotos((ps) => ps.filter((q) => q.path !== p.path))} aria-label="外す">×</button>
                <button type="button" onClick={() => move(i, 1)} aria-label="後へ">›</button>
              </div>
            </div>
          ))}
          {pending.map((p) => (
            <div className="thumb pending" key={p.key}>
              <img src={p.preview} alt="" />
              <div className="thumb-ops">
                <button type="button" onClick={() => { URL.revokeObjectURL(p.preview); setPending((ps) => ps.filter((q) => q.key !== p.key)); }} aria-label="外す">×</button>
              </div>
              <span className="badge">新</span>
            </div>
          ))}
          {photos.length + pending.length < 12 && (
            <label className="thumb add">
              <input type="file" accept="image/*" multiple onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              <span>＋</span>
            </label>
          )}
        </div>
      </div>

      <label className="toggle">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
        <span>公開する</span>
      </label>

      {err && <p className="error">{err}</p>}
      <div className="editor-actions">
        <button className="btn primary block lg" onClick={save} disabled={!!busy}>{busy || (entry ? "更新する" : "投稿する")}</button>
        {entry && <button className="btn danger block" onClick={remove} disabled={!!busy}>削除</button>}
      </div>
    </main>
  );
}

function SettingsEditor({ onSaved }: { onSaved: () => void }) {
  const [s, setS] = useState<MisoSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { fetchSettings().then(setS).catch(() => setS(DEFAULT_SETTINGS)); }, []);
  if (!s) return <p className="muted center pad">読み込み中…</p>;
  const set = <K extends keyof MisoSettings>(k: K, v: MisoSettings[K]) => setS({ ...s, [k]: v });
  const setIng = (i: number, patch: Partial<MisoSettings["ingredients"][number]>) =>
    set("ingredients", s.ingredients.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const save = async () => {
    setBusy(true); setErr("");
    try { await saveSettings(s); onSaved(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <main className="main editor">
      <h2>サイト設定</h2>
      <label className="field"><span>タイトル</span><input value={s.title} onChange={(e) => set("title", e.target.value)} /></label>
      <label className="field"><span>サブタイトル</span><input value={s.subtitle} onChange={(e) => set("subtitle", e.target.value)} /></label>
      <label className="field"><span>仕込み日（日数カウンターの起点）</span><input type="date" value={s.startDate} onChange={(e) => set("startDate", e.target.value)} /></label>
      <label className="field"><span>熟成の目安（月）</span><input type="number" inputMode="numeric" min={1} max={36} value={s.targetMonths} onChange={(e) => set("targetMonths", Number(e.target.value) || 10)} /></label>
      <label className="field"><span>素材の紹介文</span><textarea rows={4} value={s.intro} onChange={(e) => set("intro", e.target.value)} /></label>
      <div className="field">
        <span>素材と分量</span>
        {s.ingredients.map((ing, i) => (
          <div className="ing-row" key={i}>
            <input className="ing-name" value={ing.name} onChange={(e) => setIng(i, { name: e.target.value })} />
            <input className="ing-g" type="number" inputMode="numeric" value={ing.grams} onChange={(e) => setIng(i, { grams: Number(e.target.value) || 0 })} />
            <span className="unit">g</span>
            <button className="btn ghost sm" onClick={() => set("ingredients", s.ingredients.filter((_, j) => j !== i))}>×</button>
            <input className="ing-note" placeholder="メモ" value={ing.note ?? ""} onChange={(e) => setIng(i, { note: e.target.value })} />
          </div>
        ))}
        <button className="btn ghost sm" onClick={() => set("ingredients", [...s.ingredients, { name: "", grams: 0 }])}>＋ 素材を追加</button>
      </div>
      {err && <p className="error">{err}</p>}
      <button className="btn primary block lg" onClick={save} disabled={busy}>{busy ? "保存中…" : "保存する"}</button>
    </main>
  );
}
