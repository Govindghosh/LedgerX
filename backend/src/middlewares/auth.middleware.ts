import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: 'ADMIN' | 'MANAGER' | 'USER';
    };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, message: 'No token provided' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET) as any;
        req.user = {
            userId: decoded.userId,
            role: decoded.role,
        };
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid or expired token' });
        return;
    }
};

export const checkRole = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({ success: false, message: 'Forbidden' });
            return;
        }

        next();
    };
};
