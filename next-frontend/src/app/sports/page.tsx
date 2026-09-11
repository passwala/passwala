import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

async function getVenues() {
  try {
    const res = await fetch('http://127.0.0.1:3004/api/sports/venues?limit=20', { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.venues || [];
  } catch (error) {
    console.error('Failed to fetch venues:', error);
    return [];
  }
}

const SPORT_TYPES = [
  'all', 'box_cricket', 'badminton', 'turf', 'cricket_net', 
  'pickleball', 'table_tennis', 'padel', 'tennis', 'snooker', 'pool', 'cricket'
];

function formatSportName(sport: string) {
  if (sport === 'all') return 'All Sports';
  return sport.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export default async function SportsPage({ searchParams }: { searchParams: { sport?: string } }) {
  const currentSport = searchParams.sport || 'all';
  let venues = await getVenues();
  
  if (currentSport !== 'all') {
    venues = venues.filter((v: any) => v.sport_types?.includes(currentSport));
  }

  return (
    <div className="min-h-screen pb-24 pt-6 max-w-6xl mx-auto px-4 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Sports & Venues</h1>
        <p className="text-muted-foreground">Book your favorite courts and turfs</p>
      </div>

      <div className="flex overflow-x-auto pb-4 gap-3 scrollbar-hide">
        {SPORT_TYPES.map(sport => {
          const isActive = currentSport === sport;
          return (
            <Link key={sport} href={`/sports?sport=${sport === 'all' ? '' : sport}`}>
              <Badge 
                variant={isActive ? 'default' : 'secondary'} 
                className={`px-5 py-2 rounded-full whitespace-nowrap text-sm cursor-pointer transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/20'
                }`}
              >
                {formatSportName(sport)}
              </Badge>
            </Link>
          );
        })}
      </div>

      {venues.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-2xl">
          <p className="text-5xl mb-4">🏟️</p>
          <h3 className="text-xl font-semibold">No venues found</h3>
          <p className="text-muted-foreground mt-2">We couldn't find any venues for this sport.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {venues.map((venue: any) => {
            const img = venue.images?.[0] || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80';
            
            return (
              <Link href={`/sports/${venue.id}`} key={venue.id} className="group outline-none">
                <Card className="rounded-2xl overflow-hidden hover:shadow-lg transition-all h-full border-0 bg-card shadow-sm">
                  <div className="relative aspect-video overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={img} 
                      alt={venue.name} 
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                      {venue.name}
                    </h3>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span>{venue.city || 'Unknown Location'}</span>
                    </div>
                    {venue.sport_types && venue.sport_types.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {venue.sport_types.slice(0, 3).map((sport: string) => (
                          <Badge key={sport} variant="outline" className="text-[10px] py-0 capitalize">
                            {sport.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {venue.price_per_hour && Object.keys(venue.price_per_hour).length > 0 && (
                      <div className="pt-2 font-semibold text-primary text-sm">
                        From ₹{Math.min(...Object.values(venue.price_per_hour as Record<string, number>))}/hr
                      </div>
                    )}
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
