// Dev-only sample data: open http://localhost:5173/?demo
import { DEFAULT_SETTINGS, type MisoEntry, type MisoSettings } from "../lib/types";

export const demoSettings: MisoSettings = {
  ...DEFAULT_SETTINGS,
  startDate: "2026-02-08",
  intro: "大豆を一晩水に浸し、指でつぶれるまで煮る。\n塩切りした米麹と合わせ、空気を抜いて樽へ。あとは、待つ。",
};

const e = (id: string, stage: MisoEntry["stage"], date: string, title: string, body: string): MisoEntry =>
  ({ id, stage, date, title, body, photos: [], published: true });

export const demoEntries: MisoEntry[] = [
  e("1", "shikomi", "2026-02-07", "浸水", "大豆1kgを洗い、3倍の水に18時間。"),
  e("2", "shikomi", "2026-02-08", "煮る・潰す・仕込む", "圧力鍋で20分。米麹と塩を合わせて塩切り。味噌玉を投げ入れ、表面に塩をふって重石。"),
  e("3", "jukusei", "2026-05-10", "天地返し", "うっすら溜まりが上がってきた。香りは甘く、色は明るい山吹色。"),
  e("4", "jukusei", "2026-08-15", "夏を越す", "色が赤茶に深まる。酸味は無し。"),
];
