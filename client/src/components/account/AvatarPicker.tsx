'use client';

import { useRef, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { User } from '@/lib/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX = 2 * 1024 * 1024;

/** Big avatar with a camera button: pick a photo from the device → uploaded and shown everywhere. */
export function AvatarPicker({ size = 72 }: { size?: number }) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  async function upload(file?: File) {
    if (!file) return;
    if (!TYPES.includes(file.type)) return toast('Please choose a JPG, PNG or WEBP photo.', 'error');
    if (file.size > MAX) return toast('Photo must be 2 MB or smaller.', 'error');
    const local = URL.createObjectURL(file);
    setPreview(local); // show it instantly while it uploads
    setBusy(true);
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const r = await api<{ user: User; message: string }>('/users/me/avatar', { method: 'POST', body: fd });
      setUser(r.user);
      toast(r.message);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setPreview(null);
      URL.revokeObjectURL(local);
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const r = await api<{ user: User; message: string }>('/users/me/avatar', { method: 'DELETE' });
      setUser(r.user);
      toast(r.message);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar name={user.name} src={preview ?? user.avatar} size={size} className={busy ? 'opacity-60' : ''} />
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          aria-label="Change profile photo"
          className="absolute -right-1 -bottom-1 grid size-8 place-items-center rounded-full border-2 border-surface bg-ink text-bg shadow transition hover:scale-110"
        >
          {busy ? (
            <span className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
          ) : (
            <Icon name="camera" size={16} strokeWidth={2} />
          )}
        </button>
        <input ref={input} type="file" accept={TYPES.join(',')} className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
      </div>
      {user.avatar && !busy && (
        <button type="button" onClick={remove} className="text-xs text-muted underline hover:text-danger">
          Remove photo
        </button>
      )}
    </div>
  );
}
