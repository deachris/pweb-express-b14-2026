import express from 'express';
import { logger, notFound, errorHandler } from './middleware.js';
import heroRoutes from "./routes/hero.routes.js";
import skinRoutes from "./routes/skin.routes.js";
import playerRoutes from './routes/player.routes.js';
import topupMatchRoutes from './routes/topup-match.routes.js';
import purchaseRoutes from './routes/pembelian.routes.js';
import statisticsRoutes from './routes/statistics.routes.js';

const app = express();

app.use(express.json());

// 1. Pasang Logger di paling atas
app.use(logger);

// Inisiasi 6: Endpoint /health
app.get('/health', (_req, res) => {
  res.json({
    status: true,
    message: "Sukses"
  });
});

// --- ROUTE FITUR 2 (HERO) DAN FITUR LAINNYA DI-IMPORT DI SINI NANTI ---
app.use("/api/heroes", heroRoutes);
app.use("/api/skins", skinRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/players', topupMatchRoutes);
app.use('/api/players', purchaseRoutes);
app.use('/api/statistics', statisticsRoutes);

// 2. Pasang Not Found & Error Handler di paling bawah
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});