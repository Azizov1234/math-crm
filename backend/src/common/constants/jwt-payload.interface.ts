export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  branchId?: string | null;
}
