import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-microsoft';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(private configService: ConfigService) {
    super({
      clientID:
        configService.get<string>('MICROSOFT_CLIENT_ID') ||
        'microsoft-mock-client-id',
      clientSecret:
        configService.get<string>('MICROSOFT_CLIENT_SECRET') ||
        'microsoft-mock-client-secret',
      callbackURL:
        configService.get<string>('MICROSOFT_CALLBACK_URL') ||
        'http://localhost:5000/api/v1/auth/microsoft/callback',
      scope: ['user.read'],
      state: true,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    const user = {
      email:
        profile.emails && profile.emails[0]
          ? profile.emails[0].value
          : profile.userPrincipalName || `${profile.id}@microsoft.com`,
      name: profile.displayName || 'Microsoft User',
      avatarUrl: null,
      provider: 'microsoft',
      providerAccountId: profile.id,
    };
    done(null, user);
  }
}
