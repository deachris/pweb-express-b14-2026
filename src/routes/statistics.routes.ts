import { Router } from "express";
import { getStatistics } from "../controllers/statistics.controllers.js";

const router = Router();

router.get("/", getStatistics);

export default router;