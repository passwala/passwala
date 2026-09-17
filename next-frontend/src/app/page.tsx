import { HomeContent } from '@/components/HomeContent';
import { getApiUrl } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function getEvents() {
  try {
    const res = await fetch(`${getApiUrl()}/api/events/search?limit=8`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return [];
  }
}

async function getVenues() {
  try {
    const res = await fetch(`${getApiUrl()}/api/sports/venues?limit=6`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.venues || [];
  } catch (error) {
    console.error('Failed to fetch venues:', error);
    return [];
  }
}

export default async function HomePage() {
  const events = await getEvents();
  const venues = await getVenues();

  return <HomeContent events={events} venues={venues} />;
}
