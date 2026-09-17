import EventsClient from '@/components/EventsClient';
import { getApiUrl } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function getEvents(category?: string) {
  try {
    const catQuery = category ? `&category=${encodeURIComponent(category)}` : '';
    const res = await fetch(`${getApiUrl()}/api/events/search?limit=20${catQuery}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return [];
  }
}

export default async function EventsPage({ searchParams }: { searchParams: { category?: string } }) {
  const currentCategory = searchParams.category || 'All';
  const queryCategory = currentCategory === 'All' ? '' : currentCategory;
  const events = await getEvents(queryCategory);

  return <EventsClient events={events} currentCategory={currentCategory} />;
}
