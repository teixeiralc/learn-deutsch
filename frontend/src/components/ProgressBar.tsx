interface ProgressBarProps {
  value: number; // 0–100
  label?: string;
  color?: string;
}

export default function ProgressBar({ value, label, color = 'bg-gold-500' }: ProgressBarProps) {
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs text-navy-400 mb-1">
          <span>{label}</span>
          <span>{Math.round(value)}%</span>
        </div>
      )}
      <div className="w-full h-2.5 bg-navy-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full progress-bar-fill`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
