import Link from 'next/link';
import { Calendar, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function parseBannerUrl(bannerUrl: string | null) {
  if (!bannerUrl) return 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80';
  try {
    const parsed = JSON.parse(bannerUrl);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0];
    }
    if (typeof parsed === 'string') {
      return parsed;
    }
  } catch (e) {
    return bannerUrl;
  }
  return 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80';
}

async function getEvents(category?: string) {
  try {
    const catQuery = category ? `&category=${encodeURIComponent(category)}` : '';
    const res = await fetch(`http://127.0.0.1:3004/api/events/search?limit=20${catQuery}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return [];
  }
}

const CATEGORIES = ['All', 'Music & Concerts', 'Comedy & Theatre', 'Sports', 'Workshops & Classes', 'Parties & Nightlife', 'Festivals & Fairs', 'Food & Drinks', 'Conferences & Talks'];

export default async function EventsPage({ searchParams }: { searchParams: { category?: string } }) {
  const currentCategory = searchParams.category || 'All';
  const queryCategory = currentCategory === 'All' ? '' : currentCategory;
  const events = await getEvents(queryCategory);

  return (
    <div className="min-h-screen pb-24 pt-6 max-w-6xl mx-auto px-4 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">All Events</h1>
        <p className="text-muted-foreground">Discover happenings around you</p>
      </div>

      <div className="flex overflow-x-auto pb-4 gap-3 scrollbar-hide">
        {CATEGORIES.map(cat => {
          const isActive = currentCategory === cat;
          return (
            <Link key={cat} href={`/events?category=${cat === 'All' ? '' : encodeURIComponent(cat)}`}>
              <Badge 
                variant={isActive ? 'default' : 'secondary'} 
                className={`px-6 py-2 rounded-full whitespace-nowrap text-sm cursor-pointer transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/20'
                }`}
              >
                {cat}
              </Badge>
            </Link>
          );
        })}
      </div>

      {events.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-2xl">
          <p className="text-5xl mb-4">🎫</p>
          <h3 className="text-xl font-semibold">No events found</h3>
          <p className="text-muted-foreground mt-2">Try selecting a different category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {events.map((event: any) => {
            const img = parseBannerUrl(event.banner_url);
            const minPrice = event.event_ticket_tiers?.length 
              ? Math.min(...event.event_ticket_tiers.map((t: any) => t.price)) 
              : (event.base_price || 0);

            return (
              <Link href={`/events/${event.id}`} key={event.id} className="group outline-none">
                <Card className="rounded-2xl overflow-hidden hover:shadow-lg transition-all h-full border-0 bg-card shadow-sm">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={img} 
                      alt={event.title} 
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                    {event.category && (
                      <Badge className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-foreground hover:bg-background/90">
                        {event.category}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3 mr-1" />
                      <span>{new Date(event.event_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground line-clamp-1">
                      <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{event.venue_name || 'TBA'}</span>
                    </div>
                    <div className="pt-2 font-semibold text-primary">
                      {minPrice > 0 ? `From ₹${minPrice}` : 'Free'}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
