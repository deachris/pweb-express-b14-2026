import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../middleware.js";

function readNickname(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, "Nickname wajib diisi");
  }

  return value.trim();
}

function readPlayerId(value: unknown): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new HttpError(400, "ID Player harus bilangan bulat positif");
  }

  const id = Number(value);

  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
    throw new HttpError(400, "ID Player tidak valid");
  }

  return id;
}

function handleWriteError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new HttpError(409, "Nickname sudah digunakan");
    }

    if (error.code === "P2025") {
      throw new HttpError(404, "Player tidak ditemukan");
    }
  }

  throw error;
}

export const createPlayer = async (req: Request, res: Response) => {
  const nickname = readNickname(req.body?.nickname);

  const existing = await prisma.player.findUnique({
    where: { nickname },
  });

  if (existing) {
    throw new HttpError(409, "Nickname sudah digunakan");
  }

  try {
    const player = await prisma.player.create({
      data: { nickname },
    });

    res.status(201).json({
      status: true,
      message: "Berhasil membuat Player",
      data: player,
    });
  } catch (error) {
    handleWriteError(error);
  }
};

export const getPlayerById = async (req: Request, res: Response) => {
  const id = readPlayerId(req.params.player_id);

  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      playerHeroes: {
        include: {
          hero: true,
        },
      },
    },
  });

  if (!player) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  res.json({
    status: true,
    message: "Berhasil mengambil detail Player",
    data: player,
  });
};

export const updatePlayer = async (req: Request, res: Response) => {
  const id = readPlayerId(req.params.player_id);

  const existing = await prisma.player.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  const nickname = readNickname(req.body?.nickname);

  const owner = await prisma.player.findUnique({
    where: { nickname },
  });

  if (owner && owner.id !== id) {
    throw new HttpError(409, "Nickname sudah digunakan Player lain");
  }

  try {
    const player = await prisma.player.update({
      where: { id },
      data: { nickname },
    });

    res.json({
      status: true,
      message: "Berhasil mengubah nickname",
      data: player,
    });
  } catch (error) {
    handleWriteError(error);
  }
};

export const deletePlayer = async (req: Request, res: Response) => {
  const id = readPlayerId(req.params.player_id);

  try {
    const player = await prisma.player.delete({
      where: { id },
    });

    res.json({
      status: true,
      message: "Player dan data hero miliknya berhasil dihapus",
      data: player,
    });
  } catch (error) {
    handleWriteError(error);
  }
};