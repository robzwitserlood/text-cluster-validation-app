import { SidebarMenuButton } from '@databricks/appkit-ui/react';
import { Avatar, AvatarFallback } from '@databricks/appkit-ui/react';
import { useQuery } from '@tanstack/react-query';
import type { CurrentUser } from '@/lib/api';
import { currentUserQueryOptions } from '@/lib/queries';

function getInitials(user: CurrentUser | null) {
  const value = user?.name || user?.email || user?.id || 'Human Validator';
  const parts = value
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .filter(Boolean);

  return (parts[0]?.[0] ?? 'H') + (parts[1]?.[0] ?? parts[0]?.[1] ?? 'V');
}

export default function SidebarUserFooter() {
  const { data: user = null, isPending } = useQuery({
    ...currentUserQueryOptions(),
  });

  const initials = getInitials(user).toUpperCase();
  const displayName = isPending ? 'Loading user...' : (user?.name ?? 'Human Validator');
  const secondaryText = user?.email ?? (user?.isUserContext ? user.id : 'Local development');

  return (
    <SidebarMenuButton
      size="lg"
      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
    >
      <Avatar className="h-8 w-8 rounded-lg grayscale">
        <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{displayName}</span>
        <span className="text-muted-foreground truncate text-xs">{secondaryText}</span>
      </div>
    </SidebarMenuButton>
  );
}
