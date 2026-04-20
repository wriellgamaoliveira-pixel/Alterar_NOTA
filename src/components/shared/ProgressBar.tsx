interface ProgressBarProps {
  progress: number;
  message: string;
  status?: 'processing' | 'completed' | 'error';
}

export default function ProgressBar({ progress, message, status = 'processing' }: ProgressBarProps) {
  const barColor = status === 'completed' ? '#22c55e' : status === 'error' ? '#ef4444' : '#38bdf8';

  return (
    <div className="w-full rounded-xl border border-[#334155] bg-[#1e293b] p-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-[#f1f5f9]">{message}</span>
        <span className="text-sm font-bold" style={{ color: barColor, fontFamily: 'JetBrains Mono, monospace' }}>
          {Math.round(progress)}%
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#0f172a]">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}
