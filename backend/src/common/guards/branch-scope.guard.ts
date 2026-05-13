import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AccessControlService } from './access-control.service';

@Injectable()
export class BranchScopeGuard implements CanActivate {
  constructor(private readonly accessControl: AccessControlService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User context is missing');
    }

    if (user.role === UserRole.SUPERADMIN) {
      return true;
    }

    if (user.role !== UserRole.ADMIN) {
      return true;
    }

    const targetBranchId = await this.accessControl.resolveBranchIdFromRequest(request);
    if (!targetBranchId) {
      return true;
    }

    if (!user.branchId || user.branchId !== targetBranchId) {
      throw new ForbiddenException('You can only access your own branch data');
    }

    return true;
  }
}
