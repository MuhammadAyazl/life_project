import { Types, type FilterQuery } from 'mongoose';
import { Store } from '../models/Store.js';
import { Product, type ProductType } from '../models/Product.js';

/** Only products of approved + active stores are visible to shoppers. */
export async function visibleStoreIds(): Promise<Types.ObjectId[]> {
  return Store.find({ status: 'approved', isActive: true }).distinct('_id');
}

/**
 * The base filter for everything shoppers can see:
 * - product belongs to an approved, active store
 * - demo (seeded) products are shown ONLY while no real product exists yet,
 *   so the shop is never empty on day one but demo items vanish once sellers list real ones.
 */
export async function shopperFilter(): Promise<FilterQuery<ProductType>> {
  const stores = await visibleStoreIds();
  const hasReal = await Product.exists({ store: { $in: stores }, isDemo: { $ne: true } });
  return hasReal ? { store: { $in: stores }, isDemo: { $ne: true } } : { store: { $in: stores } };
}

type AnyProduct = {
  _id: unknown;
  store?: unknown;
  [k: string]: unknown;
};

/** Shapes a product for the API: `id` instead of `_id`, and a small store summary. */
export function toProduct(p: AnyProduct) {
  const { _id, __v, store, ...rest } = p as AnyProduct & { __v?: number };
  void __v;
  const s = store as { _id?: unknown; name?: string; username?: string } | undefined;
  return {
    id: String(_id),
    ...rest,
    store: s && typeof s === 'object' && 'name' in s ? { id: String(s._id), name: s.name, username: s.username } : String(store),
  };
}
