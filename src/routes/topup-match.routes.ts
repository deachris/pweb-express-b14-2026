import { Router } from "express";
import { topUp, playMatch } from "../controllers/topup-match.controller.js";

const router = Router();

router.post("/:player_id/topup", topUp);
router.post("/:player_id/matches", playMatch);

export default router;