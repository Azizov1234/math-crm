import { Global, Module } from '@nestjs/common';
import { AccessControlService } from './guards/access-control.service';
import { BranchAccessGuard } from './guards/branch-access.guard';
import { BranchScopeGuard } from './guards/branch-scope.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OwnerOrSuperadminGuard } from './guards/owner-or-superadmin.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  providers: [
    JwtAuthGuard,
    RefreshTokenGuard,
    RolesGuard,
    BranchScopeGuard,
    BranchAccessGuard,
    OwnerOrSuperadminGuard,
    AccessControlService,
  ],
  exports: [
    JwtAuthGuard,
    RefreshTokenGuard,
    RolesGuard,
    BranchScopeGuard,
    BranchAccessGuard,
    OwnerOrSuperadminGuard,
    AccessControlService,
  ],
})
export class CommonModule {}
