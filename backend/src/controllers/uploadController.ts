import { Request, Response } from 'express';

export function uploadProductImage(req: Request, res: Response): void {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'Dosya bulunamadı' });
    return;
  }
  const base = `${req.protocol}://${req.get('host')}`;
  const url = `${base}/uploads/products/${req.file.filename}`;
  res.json({ success: true, data: { url } });
}
