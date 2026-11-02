import type { Request, Response, NextFunction } from 'express';

// Class Error khusus untuk membawa status code HTTP
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// 1. Logger Middleware: Mencatat method, URL, dan status code di terminal saat request selesai
export const logger = (req: Request, res: Response, next: NextFunction) => {
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode}`);
  });
  next();
};

// 2. Endpoint Tidak Ada: Menangani URL yang tidak terdaftar dan lempar 404
export const notFound = (_req: Request, _res: Response, next: NextFunction) => {
  next(new HttpError(404, "Endpoint tidak ditemukan"));
};

// 3. Global Error Handler: Format response gagal konsisten (status: false)
export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  res.status(status).json({
    status: false,
    message: err.message || "Internal Server Error"
  });
};