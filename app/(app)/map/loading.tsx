export default function Loading() {
  return (
    <div className="space-y-3">
      <div className="skeleton h-7 w-24" />
      <div className="flex gap-2">
        <div className="skeleton h-8 w-20" />
        <div className="skeleton h-8 w-24" />
        <div className="skeleton h-8 w-20" />
      </div>
      <div className="skeleton h-[58vh] min-h-[360px] w-full rounded-card" />
    </div>
  );
}
