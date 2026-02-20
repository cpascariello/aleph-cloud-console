import { WebsiteDetailClient } from './website-detail-client'

export async function generateStaticParams() {
  return [{ id: '_' }]
}

export default async function WebsiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <WebsiteDetailClient id={id} />
}
