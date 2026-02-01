import { Request, Response, NextFunction } from 'express';
export interface AuthUser {
    id: number;
    email: string;
    role: string;
    kind: 'ADMIN' | 'USER';
}
export interface AuthRequest extends Request {
    user?: AuthUser;
    admin?: {
        id: number;
        email: string;
    };
}
export declare function generateToken(payload: AuthUser): string;
export declare function verifyToken(token: string): AuthUser | null;
export declare function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export declare function requireRole(...roles: string[]): (req: AuthRequest, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
//# sourceMappingURL=auth.d.ts.map