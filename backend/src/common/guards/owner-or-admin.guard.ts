import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

@Injectable()
export class OwnerOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User context is missing');
    }

    if (user.role === UserRole.SUPERADMIN || user.role === UserRole.ADMIN) {
      return true;
    }

    const ownerUserId = request.params?.id ?? request.params?.userId ?? request.body?.userId;

    if (ownerUserId && ownerUserId !== user.id) {
      throw new ForbiddenException('You can only modify your own profile');
    }

    return true;
  }
}
