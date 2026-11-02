import express from 'express';

const app = express();

// Body parser JSON
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    message: 'API berjalan',
    health: '/health'
  });
});

// Inisiasi 6: Endpoint /health
app.get('/health', (_req, res) => {
  res.json({
    status: true,
    message: "Sukses"
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});