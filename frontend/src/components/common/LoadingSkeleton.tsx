export default function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 bg-slate-200 rounded-xl w-1/3" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({length:4}).map((_,i) => (
          <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-slate-200 rounded-2xl" />
      <div className="space-y-2">
        {Array.from({length:6}).map((_,i) => (
          <div key={i} className="h-12 bg-slate-200 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
