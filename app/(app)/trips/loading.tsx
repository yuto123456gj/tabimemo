import { SkeletonList } from '@/components/ui/Feedback';

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-11 w-full" />
      <div className="flex gap-2">
        <div className="skeleton h-8 w-20" />
        <div className="skeleton h-8 w-24" />
        <div className="skeleton h-8 w-20" />
      </div>
      <SkeletonList count={4} />
    </div>
  );
}
