import { TerminalTabs } from '@/components/data-terminal'
import { ResourcePageHeader } from '@/components/resources/resource-page-header'
import { InstancesTab } from '@/components/compute/instances-tab'
import { GpuTab } from '@/components/compute/gpu-tab'
import { ConfidentialTab } from '@/components/compute/confidential-tab'
import { FunctionsTab } from '@/components/compute/functions-tab'

export default function ComputePage() {
  return (
    <div className="flex flex-col gap-6">
      <ResourcePageHeader
        title="Compute"
        description="Manage your compute resources"
        createHref="/compute/new"
        createLabel="Deploy"
      />
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
