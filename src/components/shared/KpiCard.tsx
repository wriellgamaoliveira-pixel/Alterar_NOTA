import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color?: string;
  delay?: number;
}

export default function KpiCard({ icon: Icon, label, value, color = '#38bdf8' }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-5 transition-all duration-300 hover:border-[#475569]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#94a3b8]">{label}</p>
          <p className="mt-2 text-2xl font-bold text-[#f1f5f9]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {value}
          </p>
        </div>
        <div
          className="rounded-lg p-2.5"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
    </div>
  );
}
