'use client';

import Link from 'next/link';
import { Calendar, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/language-context';
import { formatDisplayDate } from '@/lib/utils';

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
  } catch {
    return bannerUrl;
  }
  return 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80';
}

const CATEGORY_KEYS: { id: string; key: string; label: string }[] = [
  { id: '', key: 'cat_all', label: 'All' },
  { id: 'Music', key: 'cat_music', label: 'Music' },
  { id: 'Sports', key: 'cat_sports', label: 'Sports' },
  { id: 'Comedy', key: 'cat_comedy', label: 'Comedy' },
  { id: 'Food', key: 'cat_food', label: 'Food' },
  { id: 'Nightlife', key: 'cat_nightlife', label: 'Nightlife' },
];

export function HomeContent({ events, venues }: { events: any[]; venues: any[] }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <section className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16 px-4 mb-8">
        <div className="max-w-6xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            {t('tagline')}
          </h1>
          <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto">
            {t('hero_subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Link
              href="/events"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-11 px-8 text-blue-700"
            >
              {t('browse_events')}
            </Link>
            <Link
              href="/sports"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input h-11 px-8 bg-transparent border-white text-white hover:bg-white/10"
            >
              {t('book_sport')}
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 space-y-12">
        {/* Categories row */}
        <div className="flex overflow-x-auto pb-4 gap-3 scrollbar-hide">
          {CATEGORY_KEYS.map(cat => (
            <Link key={cat.label} href={`/events?category=${cat.id}`}>
              <Badge
                variant="secondary"
                className="px-6 py-2 rounded-full whitespace-nowrap text-sm hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer font-medium"
              >
                {t(cat.key, cat.label)}
              </Badge>
            </Link>
          ))}
        </div>

        {/* Trending Events */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{t('trending_events')}</h2>
            <Link href="/events" className="text-primary hover:underline font-medium text-sm">
              {t('see_all')}
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-2xl">
              <p className="text-4xl mb-4">🎫</p>
              <h3 className="text-lg font-semibold">{t('no_events')}</h3>
              <p className="text-muted-foreground">Check back later for exciting events!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {events.map((event: any) => {
                const img = parseBannerUrl(event.banner_url);
                const minPrice = event.event_ticket_tiers?.length
                  ? Math.min(...event.event_ticket_tiers.map((t: any) => t.price))
                  : 0;

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
                          <span suppressHydrationWarning>{formatDisplayDate(event.event_date)}</span>
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
        </section>

        {/* Sports Venues */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{t('popular_venues')}</h2>
            <Link href="/sports" className="text-primary hover:underline font-medium text-sm">
              {t('see_all')}
            </Link>
          </div>

          {venues.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-2xl">
              <p className="text-4xl mb-4">🏟️</p>
              <h3 className="text-lg font-semibold">{t('no_venues')}</h3>
              <p className="text-muted-foreground">Check back later for new turfs and courts!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
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
                          <MapPin className="w-3 h-3 mr-1 shrink-0" />
                          <span className="capitalize truncate">{venue.address || venue.city || 'Unknown Location'}</span>
                        </div>
                        {venue.sport_types && venue.sport_types.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {venue.sport_types.slice(0, 3).map((sport: string) => (
                              <Badge key={sport} variant="outline" className="text-[10px] py-0">
                                {sport.replace('_', ' ')}
                              </Badge>
                            ))}
                            {venue.sport_types.length > 3 && (
                              <Badge variant="outline" className="text-[10px] py-0">
                                +{venue.sport_types.length - 3}
                              </Badge>
                            )}
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
        </section>
      </div>
    </div>
  );
}
