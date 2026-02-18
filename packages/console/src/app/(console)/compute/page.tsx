import Link from 'next/link'
import { TerminalTabs, Button } from '@/components/data-terminal'
import { PageHeader } from '@/components/shell/page-header'
import { InstancesTab } from '@/components/compute/instances-tab'
import { GpuTab } from '@/components/compute/gpu-tab'
import { ConfidentialTab } from '@/components/compute/confidential-tab'
import { FunctionsTab } from '@/components/compute/functions-tab'
import { Plus } from 'lucide-react'

export default function ComputePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader>
        <Link href="/compute/new">
          <Button variant="primary" size="sm" iconLeft={<Plus size={16} />}>
            Deploy
          </Button>
        </Link>
      </PageHeader>
      <TerminalTabs
        tabs={[
          { label: 'Instances', content: <InstancesTab /> },
          { label: 'GPU', content: <GpuTab /> },
          { label: 'Confidential', content: <ConfidentialTab /> },
          { label: 'Functions', content: <FunctionsTab /> },
        ]}
      />
    </div>
  )
}
