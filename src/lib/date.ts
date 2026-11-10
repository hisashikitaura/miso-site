export const todayJST = () => {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
};

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(from + "T00:00:00Z");
  const b = Date.parse(to + "T00:00:00Z");
  return Math.floor((b - a) / 86400000);
}

const KANJI = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
export const toKanjiDigits = (n: number) => String(n).split("").map((c) => KANJI[+c] ?? c).join("");

export function formatJa(date: string): string {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

export function formatDot(date: string): string {
  return date ? date.replaceAll("-", ".") : "";
}
