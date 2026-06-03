import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info, context) {
    // Return the user if authenticated, or null if guest (do not throw 401 exception)
    if (err || !user) {
      return null;
    }
    return user;
  }
}
