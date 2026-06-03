import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  OnApplicationBootstrap,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async onApplicationBootstrap() {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');
    const adminName =
      this.configService.get<string>('ADMIN_NAME') || 'Apex Admin';
    const forceReset =
      this.configService.get<string>('FORCE_ADMIN_PASSWORD_RESET') === 'true';

    if (adminEmail) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { email: adminEmail },
        });

        if (!user) {
          // 1. Admin user does NOT exist -> create account
          const passwordHash = adminPassword
            ? await bcrypt.hash(adminPassword, 10)
            : null;
          await this.prisma.user.create({
            data: {
              email: adminEmail,
              name: adminName,
              passwordHash,
              role: 'super_admin',
              isVerified: true,
            },
          });
          this.logger.log(`✅ Admin account created`);
          if (passwordHash) {
            this.logger.log(`✅ Admin password initialized`);
          }
        } else {
          // 2. Admin user EXISTS -> ensure role = super_admin
          if (user.role !== 'super_admin') {
            await this.prisma.user.update({
              where: { id: user.id },
              data: { role: 'super_admin' },
            });
            this.logger.log(`✅ Admin promoted`);
          }

          // 3. Password assignment / forced reset checks
          const hasNoPassword =
            !user.passwordHash || user.passwordHash.trim() === '';
          if ((hasNoPassword || forceReset) && adminPassword) {
            const passwordHash = await bcrypt.hash(adminPassword, 10);
            await this.prisma.user.update({
              where: { id: user.id },
              data: { passwordHash },
            });
            this.logger.log(`✅ Admin password initialized`);
          }
        }
      } catch (err) {
        this.logger.error(
          `ADMIN SYSTEM: Failed executing admin bootstrap sequence: ${err}`,
        );
      }
    }
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(
        'An account with this email address already exists.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const verificationToken = randomUUID();
    const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: 'customer',
      isVerified: false,
      verificationToken,
      emailVerificationExpiresAt,
    });

    // Send verification email asynchronously
    this.mailService
      .sendVerificationEmail(user.email, verificationToken)
      .catch((err: unknown) => {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`Mail dispatch failed: ${errMsg}`);
      });

    return {
      message:
        'Registration successful. Please check your email to verify your profile.',
      userId: user.id,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email credentials or password.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email credentials or password.');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Account email not verified. Please verify your profile to log in.',
      );
    }

    const tokens = this.generateTokens(user.id, user.role);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { 
        verificationToken: token,
        emailVerificationExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException(
        'Invalid or expired email verification token.',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });

    return {
      message: 'Profile email verified successfully. You may now log in.',
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Return success statement anyway to prevent user enumeration security issues
      return {
        message:
          'If the email matches an active profile, a reset link will be sent.',
      };
    }

    const resetToken = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiresAt: expiresAt,
      },
    });

    // Send reset password email asynchronously
    this.mailService
      .sendResetPasswordEmail(user.email, resetToken)
      .catch((err: unknown) => {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`Mail dispatch failed: ${errMsg}`);
      });

    return {
      message:
        'If the email matches an active profile, a reset link will be sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException(
        'Password reset token is invalid or has expired.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });

    return {
      message:
        'Password updated successfully. You can now sign in with your new password.',
    };
  }

  async refresh(refreshToken: string) {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (
      !storedToken ||
      storedToken.isRevoked ||
      storedToken.expiresAt < new Date()
    ) {
      throw new UnauthorizedException(
        'Refresh token is invalid, revoked, or has expired.',
      );
    }

    const user = await this.usersService.findById(storedToken.userId);
    if (!user) {
      throw new UnauthorizedException(
        'User associated with token no longer exists.',
      );
    }

    // Revoke old refresh token (Token rotation setup)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    const tokens = this.generateTokens(user.id, user.role);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { isRevoked: true },
    });
    return { message: 'Logged out successfully.' };
  }

  private generateTokens(userId: string, role: string) {
    const payload = { sub: userId, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'default_secret',
      expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') ||
        '900s') as unknown as number,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret:
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        'default_refresh',
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ||
        '7d') as unknown as number,
    });

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, token: string) {
    const expiresDays = 7;
    const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  }

  async validateOAuthUser(payload: {
    email: string;
    name: string;
    avatarUrl?: string | null;
    provider: string;
    providerAccountId: string;
  }) {
    // 1. Search for existing OAuthAccount
    const oauthAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: payload.provider,
          providerAccountId: payload.providerAccountId,
        },
      },
      include: { user: true },
    });

    const oauthUser = oauthAccount?.user;

    if (oauthUser) {
      // Update avatar if provided
      if (payload.avatarUrl && oauthAccount.avatarUrl !== payload.avatarUrl) {
        await this.prisma.oAuthAccount.update({
          where: { id: oauthAccount.id },
          data: { avatarUrl: payload.avatarUrl },
        });
      }

      const tokens = this.generateTokens(oauthUser.id, oauthUser.role);
      await this.storeRefreshToken(oauthUser.id, tokens.refreshToken);
      return { user: oauthUser, ...tokens };
    }

    // 2. If no OAuthAccount, search for existing user by email
    const existingUser = await this.usersService.findByEmail(payload.email);

    if (existingUser) {
      // Link the account
      await this.prisma.oAuthAccount.create({
        data: {
          userId: existingUser.id,
          provider: payload.provider,
          providerAccountId: payload.providerAccountId,
          avatarUrl: payload.avatarUrl,
        },
      });

      const tokens = this.generateTokens(existingUser.id, existingUser.role);
      await this.storeRefreshToken(existingUser.id, tokens.refreshToken);
      return { user: existingUser, ...tokens };
    }

    // 3. Create a new user and link the account
    const newUser = await this.usersService.create({
      email: payload.email,
      name: payload.name,
      role: 'customer',
      isVerified: true, // Social accounts are pre-verified
    });

    await this.prisma.oAuthAccount.create({
      data: {
        userId: newUser.id,
        provider: payload.provider,
        providerAccountId: payload.providerAccountId,
        avatarUrl: payload.avatarUrl,
      },
    });

    const tokens = this.generateTokens(newUser.id, newUser.role);
    await this.storeRefreshToken(newUser.id, tokens.refreshToken);
    return { user: newUser, ...tokens };
  }
}
