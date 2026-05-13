import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

@Injectable()
export class OwnerOrSuperadminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User context is missing');
    }

    if (user.role === UserRole.SUPERADMIN) {
      return true;
    }

    const ownerId = request.params?.id ?? request.params?.userId ?? request.body?.userId;
    if (!ownerId || ownerId !== user.id) {
      throw new ForbiddenException('You can only access your own profile');
    }

    return true;
  }
}
