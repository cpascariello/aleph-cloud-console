import { VolumeDetailClient } from './volume-detail-client'

export async function generateStaticParams() {
  return [{ id: '_' }]
}

export default async function VolumeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <VolumeDetailClient id={id} />
}
