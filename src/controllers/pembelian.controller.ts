import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../middleware.js";

export const buyHero = async (req: Request, res: Response) => {
  const { heroId, currency } = req.body ?? {};

  // 1. Periksa input terlebih dahulu.
  if (
    typeof heroId !== "number" ||
    !Number.isInteger(heroId) ||
    heroId <= 0 ||
    heroId > 2147483647 ||
    (currency !== "BP" && currency !== "DIAMOND")
  ) {
    throw new HttpError(
      400,
      "heroId harus bilangan bulat positif dan currency harus BP atau DIAMOND"
    );
  }

  const rawPlayerId = req.params.player_id;

  if (
    typeof rawPlayerId !== "string" ||
    !/^\d+$/.test(rawPlayerId)
  ) {
    throw new HttpError(400, "ID Player tidak valid");
  }

  const playerId = Number(rawPlayerId);

  if (
    !Number.isSafeInteger(playerId) ||
    playerId <= 0 ||
    playerId > 2147483647
  ) {
    throw new HttpError(400, "ID Player tidak valid");
  }

    // 2. Periksa Player.
  const player = await prisma.player.findUnique({
    where: { id: playerId },
  });

  if (!player) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  // 3. Periksa Hero.
  const hero = await prisma.hero.findUnique({
    where: { id: heroId },
  });

  if (!hero) {
    throw new HttpError(404, "Hero tidak ditemukan");
  }

  const payWithBP = currency === "BP";
  const price = payWithBP ? hero.priceBP : hero.priceDiamond;

  // 4. Harga null berarti tidak dijual dengan mata uang tersebut.
  if (price === null) {
    throw new HttpError(
      400,
      `${hero.name} tidak dapat dibeli menggunakan ${currency}`
    );
  }

    // 5. Periksa apakah Hero sudah dimiliki.
  const ownedHero = await prisma.playerHero.findUnique({
    where: {
      playerId_heroId: {
        playerId,
        heroId,
      },
    },
  });

  if (ownedHero) {
    throw new HttpError(409, "Player sudah memiliki Hero tersebut");
  }

  // 6. Periksa saldo.
  const balance = payWithBP ? player.bp : player.diamond;

  if (balance < price) {
    throw new HttpError(
      400,
      `Saldo ${currency} tidak cukup untuk membeli ${hero.name}`
    );
  }

    try {
    const [updatedPlayer, ownership] = await prisma.$transaction([
      prisma.player.update({
        where: payWithBP
          ? { id: playerId, bp: { gte: price } }
          : { id: playerId, diamond: { gte: price } },

        data: payWithBP
          ? { bp: { decrement: price } }
          : { diamond: { decrement: price } },
      }),

      prisma.playerHero.create({
        data: {
          playerId,
          heroId,
          currency,
          pricePaid: price,
        },
      }),
    ]);

    res.status(201).json({
      status: true,
      message: "Berhasil membeli Hero",
      data: {
        hero,
        currency: ownership.currency,
        pricePaid: ownership.pricePaid,
        bp: updatedPlayer.bp,
        diamond: updatedPlayer.diamond,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new HttpError(
          409,
          "Player sudah memiliki Hero tersebut"
        );
      }

      if (error.code === "P2025") {
        const currentPlayer = await prisma.player.findUnique({
          where: { id: playerId },
        });

        if (!currentPlayer) {
          throw new HttpError(404, "Player tidak ditemukan");
        }

        throw new HttpError(
          400,
          "Saldo tidak mencukupi saat pembelian diproses"
        );
      }
    }

    throw error;
  }
};

