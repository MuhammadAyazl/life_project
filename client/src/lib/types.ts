export type Role = 'user' | 'seller' | 'admin';

export interface Plan {
  tier: 'free' | 'trial' | 'plus';
  isMember: boolean;
  billing: 'monthly' | 'yearly' | null;
  endsAt: string | null;
  daysLeft: number;
  trialUsed: boolean;
  canStartTrial: boolean;
  cancelAtPeriodEnd: boolean;
  hasBilling: boolean;
}

export interface Address {
  _id: string;
  name: string;
  email: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  plan: Plan;
  addresses: Address[];
  hasGoogle: boolean;
  twoFactorEnabled?: boolean;
}

export interface StoreRef {
  id: string;
  name: string;
  username: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  mrp: number;
  price: number;
  category: string;
  images: string[];
  art: string;
  rating: number;
  numReviews: number;
  inStock: boolean;
  sold: number;
  store: StoreRef | string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  name: string;
  rating: number;
  text: string;
  createdAt: string;
}

export type OrderStatus = 'PENDING_PAYMENT' | 'ORDER_PLACED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface OrderItem {
  product: string;
  name: string;
  slug: string;
  price: number;
  qty: number;
  image: string;
  art: string;
}

export interface Order {
  id: string;
  store: StoreRef | string;
  items: OrderItem[];
  address: Omit<Address, '_id'>;
  subtotal: number;
  discount: number;
  total: number;
  coupon: { code: string | null; discount: number };
  paymentMethod: 'COD' | 'CARD';
  isPaid: boolean;
  status: OrderStatus;
  createdAt: string;
}

export interface Store {
  id: string;
  name: string;
  username: string;
  description: string;
  address: string;
  email: string;
  phone?: string;
  logo: string;
  status?: 'pending' | 'approved' | 'rejected';
  isActive?: boolean;
  productCount?: number;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discount: number;
  expiresAt: string;
  forNewUser: boolean;
  forMember: boolean;
}
