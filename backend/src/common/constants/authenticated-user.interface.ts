export interface AuthenticatedUser {
  id: string;
  role: string;
  branchId?: string | null;
  username: string;
}
