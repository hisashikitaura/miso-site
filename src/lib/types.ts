import type { Timestamp } from "firebase/firestore/lite";

export type Stage = "shikomi" | "jukusei" | "kansei";

export const STAGES: { key: Stage; ja: string; kana: string; en: string }[] = [
  { key: "shikomi", ja: "仕込み", kana: "しこみ", en: "Preparation" },
  { key: "jukusei", ja: "熟成", kana: "じゅくせい", en: "Aging" },
  { key: "kansei", ja: "完成", kana: "かんせい", en: "Completion" },
];

export const stageInfo = (s: Stage) => STAGES.find((x) => x.key === s) ?? STAGES[0];

export type Photo = { path: string; url: string; w: number; h: number };

export type MisoEntry = {
  id: string;
  stage: Stage;
  date: string; // YYYY-MM-DD
  title: string;
  body: string;
  photos: Photo[];
  published: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type Ingredient = { name: string; grams: number; note?: string };

export type MisoSettings = {
  title: string;
  subtitle: string;
  startDate: string; // 仕込み日 YYYY-MM-DD
  targetMonths: number; // 熟成目標（月）
  ingredients: Ingredient[];
  intro: string;
};

export const DEFAULT_SETTINGS: MisoSettings = {
  title: "手前味噌",
  subtitle: "米麹・大豆・塩。三つだけで、時間が醸す。",
  startDate: "",
  targetMonths: 10,
  ingredients: [
    { name: "大豆", grams: 1000, note: "一晩浸水、柔らかく煮る" },
    { name: "米麹", grams: 1000, note: "塩と合わせて塩切り" },
    { name: "塩", grams: 420, note: "仕上がり塩分 約12%" },
  ],
  intro: "",
};
