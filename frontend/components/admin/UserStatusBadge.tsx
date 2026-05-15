interface UserStatusBadgeProps {
  status: 'active' | 'blocked';
}

export default function UserStatusBadge({ status }: UserStatusBadgeProps) {
  const styles = {
    active: 'bg-green-100 text-green-700',
    blocked: 'bg-red-100 text-red-700',
  };

  const labels = {
    active: 'Aktif',
    blocked: 'Diblokir',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
