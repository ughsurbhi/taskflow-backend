import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  type: "access" | "refresh";
}
