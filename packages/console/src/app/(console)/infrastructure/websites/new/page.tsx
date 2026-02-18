import { redirect } from 'next/navigation'

export default function NewWebsitePage() {
  redirect('/infrastructure/websites?wizard=website')
}
