'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import InvoiceView from '@/components/InvoiceView';

function InvoiceQueryContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || undefined;
  return <InvoiceView invoiceId={id} />;
}

export default function InvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-3 border-[#1B5E20] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <InvoiceQueryContent />
    </Suspense>
  );
}
