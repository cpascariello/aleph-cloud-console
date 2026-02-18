import { redirect } from 'next/navigation'

export default function NewVolumePage() {
  redirect('/infrastructure/volumes?wizard=volume')
}
