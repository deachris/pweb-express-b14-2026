import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export const getStatistics = async (_req: Request, res: Response) => {
  const [totalPlayers, totalHeroesOwned, diamondSum, topOwned, rolesGroup] = await Promise.all([
    prisma.player.count(),
    prisma.playerHero.count(),
    prisma.player.aggregate({ _sum: { diamond: true } }),
    prisma.playerHero.groupBy({
      by: ["heroId"],
      _count: { heroId: true },
      orderBy: [{ _count: { heroId: "desc" } }, { heroId: "asc" }],
      take: 1,
    }),
    prisma.hero.groupBy({
      by: ["role"],
      _count: { role: true },
      orderBy: { role: "asc" },
    }),
  ]);

  const top = topOwned[0];
  const hero = top
    ? await prisma.hero.findUnique({ where: { id: top.heroId }, select: { name: true } })
    : null;

  res.json({
    status: true,
    message: "Berhasil mengambil statistik",
    data: {
      totalPlayers,
      totalHeroesOwned,
      totalDiamond: diamondSum._sum.diamond ?? 0,
      mostOwnedHero:
        top && hero ? { heroId: top.heroId, name: hero.name, owners: top._count.heroId } : null,
      heroesPerRole: rolesGroup.map((r) => ({ role: r.role, total: r._count.role })),
    },
  });
};