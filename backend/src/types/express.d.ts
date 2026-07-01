import { DecodedIdToken } from 'firebase-admin/auth';

declare global {
  namespace Express {
    interface Request {
      user?: DecodedIdToken & {
        lojaId: string;
        role: 'OWNER' | 'MANAGER' | 'OPERATOR';
      };
    }
  }
}
