import type { Request, Response } from "express";
import { Role, Lane } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../middleware.js";

const str = (v: unknown) =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;

const validOptionalPrice = (v: unknown) =>
    v === undefined ||
    v === null ||
    v === "" ||
    (typeof v === "number" && Number.isInteger(v) && v >= 0);

// GET /api/heroes
export const getHeroes = async (req: Request, res: Response) => {
    const page = Math.max(Math.floor(Number(req.query.page)) || 1, 1);
    const limit = Math.max(Math.floor(Number(req.query.limit)) || 10, 1);
    const search = str(req.query.search);
    const role = str(req.query.role)?.toUpperCase();

    if (role && !Object.values(Role).includes(role as Role)) {
        throw new HttpError(400, "Role tidak valid");
    }

    const where = {
        ...(search && { name: { contains: search, mode: "insensitive" as const, }, }),
        ...(role && { role: role as Role }),
    };

    const [data, totalItems] = await Promise.all([
        prisma.hero.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { id: "asc" },
        }),
        prisma.hero.count({ where }),
    ]);

    res.json({
        status: true,
        message: "Berhasil mengambil data hero",
        data,
        metadata: {
            currentPage: page,
            limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
        },
    });
};

// GET /api/heroes/:hero_id
export const getHeroById = async (req: Request, res: Response) => {
    const id = Number(req.params.hero_id);

    if (!Number.isInteger(id) || id <= 0) {
        throw new HttpError(404, "Hero tidak ditemukan");
    }

    const hero = await prisma.hero.findUnique({
        where: { id },
        include: { skins: true },
    });

    if (!hero) {
        throw new HttpError(404, "Hero tidak ditemukan");
    }

    res.json({
        status: true,
        message: "Berhasil mengambil detail hero",
        data: hero,
    });
};

// POST /api/heroes
export const createHero = async (req: Request, res: Response) => {
    const { name, role, lane, releaseYear, priceBP, priceDiamond } =
        req.body ?? {};

    // 1. Periksa field
    if (!str(name) || !str(role) || !str(lane) || releaseYear === undefined || releaseYear === null || releaseYear === "") {
        throw new HttpError(400, "name, role, lane, dan releaseYear wajib diisi"
        );
    }

    // 2. Periksa nama duplikat
    const heroName = str(name)!;

    const exists = await prisma.hero.findUnique({
        where: { name: heroName },
    });

    if (exists) {
        throw new HttpError(409, "Nama hero sudah ada");
    }

    // 3. Periksa format data
    const heroRole = str(role)!.toUpperCase();
    const heroLane = str(lane)!.toUpperCase();

    if (
        !Object.values(Role).includes(heroRole as Role) ||
        !Object.values(Lane).includes(heroLane as Lane) ||
        !Number.isInteger(releaseYear) ||
        !validOptionalPrice(priceBP) ||
        !validOptionalPrice(priceDiamond)
    ) {
        throw new HttpError(400, "Data hero tidak valid");
    }

    // 4. Simpan hero baru
    const hero = await prisma.hero.create({
        data: {
            name: heroName,
            role: heroRole as Role,
            lane: heroLane as Lane,
            releaseYear,
            priceBP: priceBP === "" ? null : priceBP,
            priceDiamond: priceDiamond === "" ? null : priceDiamond,
        },
    });

    res.status(201).json({
        status: true,
        message: "Berhasil membuat hero",
        data: hero,
    });
};
