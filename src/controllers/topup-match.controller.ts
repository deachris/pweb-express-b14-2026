import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../middleware.js";

const REWARD = { WIN: 300, LOSE: 100 } as const;

const findPlayerId = async (raw: unknown) => {
  const id = Number(raw);
  if (!Number.isInteger(id)) throw new HttpError(404, "Player tidak ditemukan");
  const player = await prisma.player.findUnique({ where: { id }, select: { id: true } });
  if (!player) throw new HttpError(404, "Player tidak ditemukan");
  return id;
};

export const topUp = async (req: Request, res: Response) => {
  const { amount } = req.body ?? {};

  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
    throw new HttpError(400, "amount harus bilangan bulat positif");
  }

  const id = await findPlayerId(req.params.player_id);

  const player = await prisma.player.update({
    where: { id },
    data: { diamond: { increment: amount } },
  });

  res.json({
    status: true,
    message: "Top up berhasil",
    data: { playerId: player.id, nickname: player.nickname, amount, diamond: player.diamond },
  });
};

export const playMatch = async (req: Request, res: Response) => {
  const { result } = req.body ?? {};

  if (result !== "WIN" && result !== "LOSE") {
    throw new HttpError(400, "result harus WIN atau LOSE");
  }

  const id = await findPlayerId(req.params.player_id);
  const bpEarned = REWARD[result as keyof typeof REWARD];

  const player = await prisma.player.update({
    where: { id },
    data: { bp: { increment: bpEarned } },
  });

  res.json({
    status: true,
    message: "Match selesai",
    data: { playerId: player.id, nickname: player.nickname, result, bpEarned, bp: player.bp },
  });
};