import { Router } from "express";
import { getSkinById, getSkins } from "../controllers/skin.controller.js";

const router = Router();

// GET /api/skins
router.get("/", getSkins);

// GET /api/skins/:skin_id
router.get("/:skin_id", getSkinById);

export default router;
