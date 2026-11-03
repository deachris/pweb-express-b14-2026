import type { Request, Response } from "express";
import { Rarity } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../middleware.js";

const str = (v: unknown) =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;

// GET /api/skins
export const getSkins = async (req: Request, res: Response) => {
    const page = Math.max(Math.floor(Number(req.query.page)) || 1, 1);
    const limit = Math.max(Math.floor(Number(req.query.limit)) || 10, 1);
    const heroIdValue = str(req.query.heroId);
    const rarity = str(req.query.rarity)?.toUpperCase();

    let heroId: number | undefined;
    if (heroIdValue) {
        heroId = Number(heroIdValue);
        if (!Number.isInteger(heroId) || heroId <= 0) {
            throw new HttpError(400, "heroId tidak valid");
        }
    }

    if (rarity && !Object.values(Rarity).includes(rarity as Rarity)) {
        throw new HttpError(400, "Rarity tidak valid");
    }

    const where = {
        ...(heroId !== undefined && { heroId }),
        ...(rarity && { rarity: rarity as Rarity }),
    };

    const [data, totalItems] = await Promise.all([
        prisma.skin.findMany({
            where,
            include: { hero: true },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { id: "asc" },
        }),
        prisma.skin.count({ where }),
    ]);

    res.json({
        status: true,
        message: "Berhasil mengambil data skin",
        data,
        metadata: {
            currentPage: page,
            limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
        },
    });
};

// GET /api/skins/:skin_id
export const getSkinById = async (req: Request, res: Response) => {
    const id = Number(req.params.skin_id);

    if (!Number.isInteger(id) || id <= 0) {
        throw new HttpError(404, "Skin tidak ditemukan");
    }

    const skin = await prisma.skin.findUnique({
        where: { id },
        include: { hero: true },
    });

    if (!skin) {
        throw new HttpError(404, "Skin tidak ditemukan");
    }

    res.json({
        status: true,
        message: "Berhasil mengambil detail skin",
        data: skin,
    });
};
