interface UserRoleBadgeProps {
  role: 'user' | 'admin';
}

export default function UserRoleBadge({ role }: UserRoleBadgeProps) {
  const styles = {
    user: 'bg-blue-100 text-blue-700',
    admin: 'bg-purple-100 text-purple-700',
  };

  const labels = {
    user: 'User',
    admin: 'Admin',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[role]}`}>
      {labels[role]}
    </span>
  );
}
