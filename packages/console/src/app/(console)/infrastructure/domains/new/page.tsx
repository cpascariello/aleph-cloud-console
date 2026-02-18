import { redirect } from 'next/navigation'

export default function NewDomainPage() {
  redirect('/infrastructure/domains?wizard=domain')
}
