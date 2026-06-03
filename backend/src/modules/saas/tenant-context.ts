import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  tenantId: string | null;
}

@Injectable()
export class TenantContext {
  private static readonly storage = new AsyncLocalStorage<TenantStore>();

  run<T>(tenantId: string | null, callback: () => T): T {
    return TenantContext.storage.run({ tenantId }, callback);
  }

  getTenantId(): string | null {
    const store = TenantContext.storage.getStore();
    return store ? store.tenantId : null;
  }
}
