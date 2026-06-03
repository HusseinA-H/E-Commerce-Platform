/**
 * @deprecated
 * This file is a compatibility shim only.
 * All types are now defined in `@/types/index.ts`.
 * All data is served by the NestJS backend via React Query hooks.
 *
 * Migrate any remaining imports from `../data/mockData` to `@/types`.
 * This file will be removed in a future cleanup pass.
 */

export type { Product, Review, Order, UserAccount } from '../types/index';

// Empty arrays kept for backwards compatibility — do NOT populate these.
// All catalog data comes from the backend API.
export const PRODUCTS: import('../types/index').Product[] = [];
export const REVIEWS: import('../types/index').Review[] = [];
export const MOCK_ORDERS: import('../types/index').Order[] = [];
export const MOCK_USERS: import('../types/index').UserAccount[] = [];
