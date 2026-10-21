interface UserRoleBadgeProps {
  role: 'user' | 'admin' | 'ads_analyst';
}

export default function UserRoleBadge({ role }: UserRoleBadgeProps) {
  const styles = {
    ads_analyst: 'bg-emerald-100 text-emerald-700',
    user: 'bg-blue-100 text-blue-700',
    admin: 'bg-purple-100 text-purple-700',
  };

  const labels = {
    ads_analyst: 'Analis Iklan',
    user: 'User',
    admin: 'Admin',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[role]}`}>
      {labels[role]}
    </span>
  );
}
