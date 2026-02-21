export default function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="w-12 h-12 border-4 border-navy-700 border-t-gold-500 rounded-full animate-spin" />
      <p className="text-navy-400 text-sm">{message}</p>
    </div>
  );
}
