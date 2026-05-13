import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { comparePassword } from '../../common/utils/password.util';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto, requestMeta?: { ip?: string; userAgent?: string }) {
    const user = await this.authRepository.findUserByIdentifier(dto.identifier);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await comparePassword(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens({
      userId: user.id,
      username: user.username,
      role: user.role,
      branchId: user.branchId,
    });

    const saltRounds = this.configService.get<number>('app.bcryptSaltRounds') ?? 10;
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, saltRounds);

    await Promise.all([
      this.authRepository.updateRefreshTokenHash(user.id, refreshTokenHash),
      this.authRepository.updateLastLoginAt(user.id),
      this.authRepository.createActionLog({
        userId: user.id,
        role: user.role,
        action: 'LOGIN',
        module: 'AUTH',
        description: 'User logged in',
        ipAddress: requestMeta?.ip,
        userAgent: requestMeta?.userAgent,
      }),
    ]);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.toSafeUser(user),
    };
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.authRepository.findUserById(userId);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token is invalid');
    }

    const isRefreshTokenMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isRefreshTokenMatch) {
      throw new UnauthorizedException('Refresh token is invalid');
    }

    const tokens = await this.generateTokens({
      userId: user.id,
      username: user.username,
      role: user.role,
      branchId: user.branchId,
    });

    const saltRounds = this.configService.get<number>('app.bcryptSaltRounds') ?? 10;
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, saltRounds);
    await this.authRepository.updateRefreshTokenHash(user.id, refreshTokenHash);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.toSafeUser(user),
    };
  }

  async logout(userId: string, requestMeta?: { ip?: string; userAgent?: string }) {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      return { success: true };
    }

    await Promise.all([
      this.authRepository.updateRefreshTokenHash(userId, null),
      this.authRepository.createActionLog({
        userId,
        role: user.role,
        action: 'LOGOUT',
        module: 'AUTH',
        description: 'User logged out',
        ipAddress: requestMeta?.ip,
        userAgent: requestMeta?.userAgent,
      }),
    ]);

    return { success: true };
  }

  async me(userId: string) {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.toSafeUser(user);
  }

  private async generateTokens(payload: {
    userId: string;
    username: string;
    role: string;
    branchId?: string | null;
  }) {
    const jwtConfig = this.configService.get('jwt');

    const tokenPayload = {
      sub: payload.userId,
      username: payload.username,
      role: payload.role,
      branchId: payload.branchId ?? null,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(tokenPayload, {
        secret: jwtConfig.accessSecret,
        expiresIn: jwtConfig.accessExpiresIn,
      }),
      this.jwtService.signAsync(tokenPayload, {
        secret: jwtConfig.refreshSecret,
        expiresIn: jwtConfig.refreshExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private toSafeUser(user: any) {
    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      branchId: user.branchId,
      photoUrl: user.photoUrl,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
