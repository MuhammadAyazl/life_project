import { shortDate } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/misc';

export type AdminStore = {
  id: string;
  name: string;
  username: string;
  description: string;
  address: string;
  email: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  isActive: boolean;
  createdAt: string;
  owner: { name: string; email: string } | null;
};

export function StoreCard({ s, footer }: { s: AdminStore; footer: React.ReactNode }) {
  return (
    <article className="grid max-w-4xl gap-2 rounded-xl border border-line bg-surface p-6">
      <span className="grid size-14 place-items-center rounded-2xl bg-brand font-display text-2xl font-bold text-brand-ink">{s.name.charAt(0)}</span>
      <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
        {s.name} <span className="text-sm font-normal text-muted">@{s.username}</span>
        <Badge tone={s.status === 'approved' ? 'green' : s.status === 'pending' ? 'amber' : 'red'}>{s.status}</Badge>
      </h2>
      <p className="text-sm text-muted">{s.description}</p>
      <ul className="grid gap-1 text-sm text-muted">
        <li className="flex items-center gap-2">
          <Icon name="pin" size={15} />
          {s.address}
        </li>
        <li className="flex items-center gap-2">
          <Icon name="phone" size={15} />
          {s.phone}
        </li>
        <li className="flex items-center gap-2">
          <Icon name="mail" size={15} />
          {s.email}
        </li>
      </ul>
      <p className="text-sm text-muted">
        Applied on {shortDate(s.createdAt)} by <b className="font-medium text-ink">{s.owner?.name || s.owner?.email}</b> ({s.owner?.email})
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-end gap-3">{footer}</div>
    </article>
  );
}
