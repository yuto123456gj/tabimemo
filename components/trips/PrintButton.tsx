'use client';

import { Button } from '@/components/ui/Button';
import { IconPrint } from '@/components/ui/Icons';

export function PrintButton({ label = '印刷する' }: { label?: string }) {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()}>
      <IconPrint width={16} height={16} />
      {label}
    </Button>
  );
}
