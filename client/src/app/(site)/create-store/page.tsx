import type { Metadata } from 'next';
import { CreateStoreView } from './CreateStoreView';

export const metadata: Metadata = {
  title: 'Create Your Store - Sell on ShopFussion',
  description: 'Open your own store on ShopFussion and reach shoppers looking for the latest gadgets.',
  alternates: { canonical: '/create-store' },
};

export default function CreateStorePage() {
  return <CreateStoreView />;
}
