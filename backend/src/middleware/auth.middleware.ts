import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User, IUser } from '../models/user.model';
import { AppError } from './error.middleware';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export const protect = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Not authorized, token missing', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string };

    // Get user from token
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return next(new AppError('User not found with this token', 404));
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    return next(new AppError('Not authorized, token invalid', 401));
  }
};
