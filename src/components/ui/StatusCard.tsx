import { getStatusIcon, STATUS_COLORS } from '../../lib/utils';

interface StatusCardProps {
  status: string;
  count: number;
  title?: string;
}

export function StatusCard({ status, count, title }: StatusCardProps) {
  const color = STATUS_COLORS[status] || STATUS_COLORS['incomplete'];
  const displayTitle = title || status;

  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border ${color}`}>
      <div className="flex items-center gap-3">
        {getStatusIcon(status)}
        <span className="font-medium capitalize">{displayTitle}</span>
      </div>
      <span className="text-2xl font-bold">{count}</span>
    </div>
  );
}
