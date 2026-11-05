import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma.js";

type HeroJson = {
  name: string;
  primaryRole: any;
  primaryLane: any;
  releaseYear: number;
  priceBP: number | null;
  priceDiamond: number | null;
};

type SkinJson = {
  name: string;
  heroId: number;
  rarity: any;
  priceDiamond: number | null;
};

const readJson = async <T>(file: string): Promise<T> =>
  JSON.parse(await readFile(join(process.cwd(), "data", file), "utf-8"));

async function main() {
  const heroes = await readJson<HeroJson[]>("heroes.json");
  const skins = await readJson<SkinJson[]>("skins.json");

  await prisma.$executeRawUnsafe(
    `TRUNCATE "PlayerHero", "Player", "Skin", "Hero" RESTART IDENTITY CASCADE`
  );

  await prisma.hero.createMany({
    data: heroes.map((h) => ({
      name: h.name,
      role: String(h.primaryRole).toUpperCase() as any,
      lane: String(h.primaryLane).toUpperCase() as any,
      releaseYear: h.releaseYear,
      priceBP: h.priceBP ?? null,
      priceDiamond: h.priceDiamond ?? null,
    })),
  });

  await prisma.skin.createMany({
    data: skins.map((s) => ({
      name: s.name,
      heroId: s.heroId,
      rarity: String(s.rarity).toUpperCase() as any,
      priceDiamond: s.priceDiamond ?? null,
    })),
  });

  await prisma.player.createMany({
    data: [
      { nickname: "ArekITS", bp: 1500, diamond: 75 },
      { nickname: "SangPushRank", bp: 13000, diamond: 2892 },
      { nickname: "MageSurabaya", bp: 10000, diamond: 0 },
    ],
  });

  await prisma.playerHero.createMany({
    data: [
      { playerId: 1, heroId: 18, currency: "BP", pricePaid: 2000 },
      { playerId: 1, heroId: 1, currency: "BP", pricePaid: 10800 },
      { playerId: 2, heroId: 84, currency: "DIAMOND", pricePaid: 599 },
      { playerId: 2, heroId: 56, currency: "BP", pricePaid: 32000 },
    ],
  });

  const [h, s, p] = await Promise.all([
    prisma.hero.count(),
    prisma.skin.count(),
    prisma.player.count(),
  ]);
  console.log(`Seed berhasil: ${h} hero, ${s} skin, ${p} player`);
}

main()
  .catch((e) => {
    console.error("Seed gagal:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());