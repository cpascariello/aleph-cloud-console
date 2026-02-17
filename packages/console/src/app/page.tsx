import { Heading, Text } from "@/components/data-terminal";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <Heading level={1}>Aleph Cloud Console</Heading>
      <Text variant="muted">Design system integration verified.</Text>
    </main>
  );
}
