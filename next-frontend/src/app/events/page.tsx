import EventsClient from '@/components/EventsClient';
import { getApiUrl } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function getEvents(category?: string, query?: string) {
  try {
    let qStr = '';
    if (category && category !== 'All') {
      qStr += `&category=${encodeURIComponent(category)}`;
    }
    if (query && query.trim()) {
      qStr += `&q=${encodeURIComponent(query.trim())}`;
    }
    const res = await fetch(`${getApiUrl()}/api/events/search?limit=20${qStr}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return [];
  }
}

export default async function EventsPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ category?: string; q?: string; query?: string }> 
}) {
  const params = await searchParams;
  const currentCategory = params?.category || 'All';
  const searchQuery = params?.q || params?.query || '';
  const queryCategory = currentCategory === 'All' ? '' : currentCategory;
  const events = await getEvents(queryCategory, searchQuery);

  return <EventsClient events={events} currentCategory={currentCategory} />;
}
