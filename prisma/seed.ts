import { readFile } from "node:fs/promises";
import { Lane, Rarity, Role } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { prisma } from "../src/lib/prisma.js";

type HeroSeedRow = {
    name: string;
    primaryRole: string;
    primaryLane: string;
    releaseYear: number;
    priceBP: number | null;
    priceDiamond: number | null;
};

type SkinCsvRow = {
    name: string;
    heroId: string;
    rarity: string;
    priceDiamond: string;
};

const isOptionalPrice = (value: unknown) =>
    value === null ||
    (typeof value === "number" && Number.isInteger(value) && value >= 0);

const main = async () => {
    const [heroesJson, skinsCsv] = await Promise.all([
        readFile(new URL("../heroes.json", import.meta.url), "utf8"),
        readFile(new URL("./skins.csv", import.meta.url), "utf8"),
    ]);

    const heroes = JSON.parse(heroesJson) as HeroSeedRow[];
    const skinRows = parse<SkinCsvRow>(skinsCsv, {
        bom: true,
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });

    if (heroes.length === 0) {
        throw new Error("Dataset hero kosong");
    }

    const heroData = heroes.map((hero, index) => {
        const role = hero.primaryRole.toUpperCase();
        const lane = hero.primaryLane.toUpperCase();
        if (
            !Object.values(Role).includes(role as Role) ||
            !Object.values(Lane).includes(lane as Lane) ||
            !Number.isInteger(hero.releaseYear) ||
            !isOptionalPrice(hero.priceBP) ||
            !isOptionalPrice(hero.priceDiamond)
        ) {
            throw new Error(`Data hero pada urutan ${index + 1} tidak valid`);
        }

        return {
            name: hero.name,
            role: role as Role,
            lane: lane as Lane,
            releaseYear: hero.releaseYear,
            priceBP: hero.priceBP,
            priceDiamond: hero.priceDiamond,
        };
    });

    const skinData = skinRows.map((row, index) => {
        const sourceHeroId = Number(row.heroId);
        const rarity = row.rarity.toUpperCase();
        const priceDiamond =
            row.priceDiamond === "" ? null : Number(row.priceDiamond);

        if (
            !row.name ||
            !Number.isInteger(sourceHeroId) ||
            sourceHeroId < 1 ||
            sourceHeroId > heroes.length ||
            !Object.values(Rarity).includes(rarity as Rarity) ||
            !isOptionalPrice(priceDiamond)
        ) {
            throw new Error(`Data skin pada baris ${index + 2} tidak valid`);
        }

        return {
            name: row.name,
            sourceHeroId,
            rarity: rarity as Rarity,
            priceDiamond,
        };
    });

    await prisma.hero.createMany({ data: heroData, skipDuplicates: true });

    const savedHeroes = await prisma.hero.findMany({
        where: { name: { in: heroData.map(({ name }) => name) } },
        select: { id: true, name: true },
    });
    const heroIdByName = new Map(
        savedHeroes.map((hero) => [hero.name, hero.id]),
    );
    const skinsToSeed = skinData.map((skin) => {
        const sourceHero = heroes[skin.sourceHeroId - 1];
        const heroId = sourceHero ? heroIdByName.get(sourceHero.name) : undefined;
        if (heroId === undefined) {
            throw new Error(
                `Hero untuk heroId ${skin.sourceHeroId} tidak ditemukan`,
            );
        }

        return {
            name: skin.name,
            heroId,
            rarity: skin.rarity,
            priceDiamond: skin.priceDiamond,
        };
    });

    const existingSkins = await prisma.skin.findMany({
        select: { name: true, heroId: true, rarity: true, priceDiamond: true },
    });
    const skinKey = (skin: (typeof skinsToSeed)[number]) =>
        JSON.stringify([
            skin.name,
            skin.heroId,
            skin.rarity,
            skin.priceDiamond,
        ]);
    const existingKeys = new Set(existingSkins.map(skinKey));
    const newSkins = skinsToSeed.filter((skin) => !existingKeys.has(skinKey(skin)));

    if (newSkins.length > 0) {
        await prisma.skin.createMany({ data: newSkins });
    }

    console.log(
        `Seed selesai: ${heroData.length} hero tersedia; ${newSkins.length} skin ditambahkan.`,
    );
};

main()
    .catch((error: unknown) => {
        console.error("Seed gagal:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
