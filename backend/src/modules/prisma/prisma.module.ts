import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantContext } from '../saas/tenant-context';

@Global()
@Module({
  providers: [PrismaService, TenantContext],
  exports: [PrismaService, TenantContext],
})
export class PrismaModule {}
