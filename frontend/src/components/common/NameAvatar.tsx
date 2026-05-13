import type { HTMLAttributes } from 'react';
import { cn } from '@/utils';

const AVATAR_GRADIENTS = [
  'from-indigo-500 to-violet-600',
  'from-sky-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-fuchsia-500 to-pink-500',
  'from-rose-500 to-red-500',
  'from-blue-600 to-indigo-500',
  'from-lime-500 to-green-500',
];

function getNameHash(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getInitials(fullName?: string | null, maxChars = 1) {
  const value = fullName?.trim();
  if (!value) return 'U';

  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, maxChars).toUpperCase();

  return parts
    .slice(0, Math.max(maxChars, 1))
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

interface NameAvatarProps extends HTMLAttributes<HTMLDivElement> {
  fullName?: string | null;
  maxChars?: number;
}

export default function NameAvatar({ fullName, maxChars = 1, className, ...props }: NameAvatarProps) {
  const displayName = fullName?.trim() || 'User';
  const hash = getNameHash(displayName.toLowerCase());
  const gradientClass = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
  const initials = getInitials(displayName, maxChars);

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-xl bg-gradient-to-tr text-white font-bold select-none shadow-sm',
        gradientClass,
        className,
      )}
      title={displayName}
      aria-label={`${displayName} avatar`}
      {...props}
    >
      {initials}
    </div>
  );
}
