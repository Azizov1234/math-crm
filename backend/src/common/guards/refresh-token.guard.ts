import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../constants/jwt-payload.interface';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const bodyToken = request.body?.refreshToken;
    const headerToken = request.headers['x-refresh-token'];
    const authHeader = request.headers.authorization as string | undefined;

    const refreshToken =
      bodyToken ??
      headerToken ??
      (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined);

    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new UnauthorizedException('Refresh token is missing');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      request.refreshToken = refreshToken;
      request.user = {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
        branchId: payload.branchId,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
