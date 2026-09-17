import SportsClient from '@/components/SportsClient';
import { getApiUrl } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function getVenues() {
  try {
    const res = await fetch(`${getApiUrl()}/api/sports/venues?limit=20`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.venues || [];
  } catch (error) {
    console.error('Failed to fetch venues:', error);
    return [];
  }
}

export default async function SportsPage({ searchParams }: { searchParams: { sport?: string } }) {
  const currentSport = searchParams.sport || 'all';
  let venues = await getVenues();
  
  if (currentSport !== 'all') {
    venues = venues.filter((v: any) => v.sport_types?.includes(currentSport));
  }

  return <SportsClient venues={venues} currentSport={currentSport} />;
}
