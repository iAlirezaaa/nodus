import NodusApp from '@/components/NodusApp';
export default async function Home({ searchParams }: { searchParams: Promise<{ room?: string | string[] }> }) {
  const room = (await searchParams).room;
  return <NodusApp initialRoomId={typeof room === 'string' && room ? room : null} />;
}
