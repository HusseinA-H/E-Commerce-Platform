import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { GoogleOauthGuard } from './guards/google-oauth.guard';
import { MicrosoftOauthGuard } from './guards/microsoft-oauth.guard';
import { GitHubOauthGuard } from './guards/github-oauth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Authenticate user and retrieve tokens' })
  @ApiResponse({ status: 200, description: 'User authenticated successfully.' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);

    const isProd = process.env.NODE_ENV === 'production';
    const accessCookieName = isProd ? '__Host-accessToken' : 'accessToken';
    const refreshCookieName = isProd ? '__Host-refreshToken' : 'refreshToken';

    // Set secure HTTP-only cookies
    response.cookie(accessCookieName, result.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    response.cookie(refreshCookieName, result.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    return {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verify user email profile via verification token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully.' })
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 15 * 60 * 1000 } })
  @ApiOperation({ summary: 'Request password reset verification email' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 15 * 60 * 1000 } })
  @ApiOperation({ summary: 'Reset account password with reset token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @ApiOperation({
    summary: 'Issue new access tokens using active refresh tokens',
  })
  async refresh(
    @Req() request: Request,
    @Body() body: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const isProd = process.env.NODE_ENV === 'production';
    const refreshCookieName = isProd ? '__Host-refreshToken' : 'refreshToken';

    const cookies = request.cookies as unknown as
      | Record<string, string>
      | undefined;
    const token = body.refreshToken || cookies?.[refreshCookieName];
    if (!token) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    const result = await this.authService.refresh(token);

    const accessCookieName = isProd ? '__Host-accessToken' : 'accessToken';

    response.cookie(accessCookieName, result.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });

    response.cookie(refreshCookieName, result.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user and revoke refresh token' })
  async logout(
    @Req() request: Request,
    @Body() body: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.logger.log('logout initiated');
    const isProd = process.env.NODE_ENV === 'production';
    const accessCookieName = isProd ? '__Host-accessToken' : 'accessToken';
    const refreshCookieName = isProd ? '__Host-refreshToken' : 'refreshToken';

    const cookies = request.cookies as unknown as
      | Record<string, string>
      | undefined;
    const token = body.refreshToken || cookies?.[refreshCookieName];
    if (token) {
      try {
        await this.authService.logout(token);
        this.logger.log('token revoked');
      } catch (error: any) {
        this.logger.warn(`Failed to revoke token: ${error.message}`);
      }
    } else {
      this.logger.log('No refresh token found to revoke (idempotent path)');
    }

    response.clearCookie(accessCookieName, { path: '/' });
    response.clearCookie(refreshCookieName, { path: '/' });
    response.clearCookie('connect.sid', { path: '/' });
    this.logger.log('cookies cleared');

    return { message: 'Logged out successfully.' };
  }

  @Get('google')
  @SkipThrottle()
  @UseGuards(GoogleOauthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleAuth() {}

  @Get('google/callback')
  @SkipThrottle()
  @UseGuards(GoogleOauthGuard)
  @ApiOperation({ summary: 'Google OAuth callback handler' })
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    return this.handleOAuthCallback(req.user, res);
  }

  @Get('microsoft')
  @SkipThrottle()
  @UseGuards(MicrosoftOauthGuard)
  @ApiOperation({ summary: 'Initiate Microsoft OAuth login' })
  async microsoftAuth() {}

  @Get('microsoft/callback')
  @SkipThrottle()
  @UseGuards(MicrosoftOauthGuard)
  @ApiOperation({ summary: 'Microsoft OAuth callback handler' })
  async microsoftAuthCallback(@Req() req: any, @Res() res: Response) {
    return this.handleOAuthCallback(req.user, res);
  }

  @Get('github')
  @SkipThrottle()
  @UseGuards(GitHubOauthGuard)
  @ApiOperation({ summary: 'Initiate GitHub OAuth login' })
  async githubAuth() {}

  @Get('github/callback')
  @SkipThrottle()
  @UseGuards(GitHubOauthGuard)
  @ApiOperation({ summary: 'GitHub OAuth callback handler' })
  async githubAuthCallback(@Req() req: any, @Res() res: Response) {
    return this.handleOAuthCallback(req.user, res);
  }

  private async handleOAuthCallback(userPayload: any, res: Response) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    try {
      if (!userPayload) {
        return res.redirect(
          `${frontendUrl}/auth/callback?status=error&message=No+user+profile+received`,
        );
      }

      const result = await this.authService.validateOAuthUser({
        email: userPayload.email,
        name: userPayload.name,
        avatarUrl: userPayload.avatarUrl,
        provider: userPayload.provider,
        providerAccountId: userPayload.providerAccountId,
      });

      const isProd = process.env.NODE_ENV === 'production';
      const accessCookieName = isProd ? '__Host-accessToken' : 'accessToken';
      const refreshCookieName = isProd ? '__Host-refreshToken' : 'refreshToken';

      // Set cookies
      res.cookie(accessCookieName, result.accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 mins
        path: '/',
      });

      res.cookie(refreshCookieName, result.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      return res.redirect(`${frontendUrl}/auth/callback?status=success`);
    } catch (error: any) {
      const errMsg = error.message || 'OAuth authentication failed';
      return res.redirect(
        `${frontendUrl}/auth/callback?status=error&message=${encodeURIComponent(errMsg)}`,
      );
    }
  }
}
