import InvoiceView from '@/components/InvoiceView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <InvoiceView invoiceId={id} />;
}
