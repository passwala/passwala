import { HomeContent } from '@/components/HomeContent';

async function getEvents() {
  try {
    const res = await fetch('http://127.0.0.1:3004/api/events/search?limit=8', { cache: 'no-store' });
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
    const res = await fetch('http://127.0.0.1:3004/api/sports/venues?limit=6', { cache: 'no-store' });
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
