// Error handling middleware placeholder - will be implemented in later tasks
import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Implementation will be added in task 8
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
};