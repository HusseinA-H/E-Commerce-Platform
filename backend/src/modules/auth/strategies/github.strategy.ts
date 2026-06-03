import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private configService: ConfigService) {
    super({
      clientID:
        configService.get<string>('GITHUB_CLIENT_ID') ||
        'github-mock-client-id',
      clientSecret:
        configService.get<string>('GITHUB_CLIENT_SECRET') ||
        'github-mock-client-secret',
      callbackURL:
        configService.get<string>('GITHUB_CALLBACK_URL') ||
        'http://localhost:5000/api/v1/auth/github/callback',
      scope: ['user:email'],
      state: true as any,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    const { displayName, username, emails, photos } = profile;
    const user = {
      email:
        emails && emails[0]
          ? emails[0].value
          : `${username || profile.id}@github.com`,
      name: displayName || username || 'GitHub User',
      avatarUrl: photos && photos[0] ? photos[0].value : null,
      provider: 'github',
      providerAccountId: profile.id,
    };
    done(null, user);
  }
}
