export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="skeleton h-48 w-full rounded-card" />
      <div className="flex gap-2">
        <div className="skeleton h-14 w-24 rounded-2xl" />
        <div className="skeleton h-14 w-24 rounded-2xl" />
        <div className="skeleton h-14 w-24 rounded-2xl" />
      </div>
      <div className="space-y-2.5">
        <div className="skeleton h-24 w-full rounded-card" />
        <div className="skeleton h-24 w-full rounded-card" />
      </div>
      <div className="skeleton h-56 w-full rounded-card" />
    </div>
  );
}
