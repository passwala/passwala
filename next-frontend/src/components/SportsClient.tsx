'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/language-context';

const SPORT_TYPES = [
  'all', 'box_cricket', 'badminton', 'turf', 'cricket_net', 
  'pickleball', 'table_tennis', 'padel', 'tennis', 'snooker', 'pool', 'cricket'
];

interface SportsClientProps {
  venues: any[];
  currentSport: string;
}

export default function SportsClient({ venues, currentSport }: SportsClientProps) {
  const { t } = useTranslation();

  const formatSportName = (sport: string) => {
    if (sport === 'all') return t('all_sports', 'All Sports');
    return t(sport, sport.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '));
  };

  return (
    <div className="min-h-screen pb-24 pt-6 max-w-6xl mx-auto px-4 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('sports_and_venues', 'Sports & Venues')}</h1>
        <p className="text-muted-foreground">{t('sports_subtitle', 'Book your favorite courts and turfs')}</p>
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
          <h3 className="text-xl font-semibold">{t('no_venues_found', 'No venues found')}</h3>
          <p className="text-muted-foreground mt-2">{t('no_venues_sub', "We couldn't find any venues for this sport.")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {venues.map((venue: any) => {
            const img = venue.images?.[0] || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80';
            const prices = venue.price_per_hour && Object.keys(venue.price_per_hour).length > 0
              ? Object.values(venue.price_per_hour as Record<string, number>)
              : [];
            const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
            
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
                      <span className="capitalize truncate">{venue.address || venue.city || t('unknown_location', 'Unknown Location')}</span>
                    </div>
                    {venue.sport_types && venue.sport_types.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {venue.sport_types.slice(0, 3).map((s: string) => (
                          <Badge key={s} variant="outline" className="text-[10px] py-0 capitalize">
                            {formatSportName(s)}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {minPrice > 0 && (
                      <div className="pt-2 font-semibold text-primary text-sm">
                        {t('from_price_hr', `From ₹${minPrice}/hr`, { price: minPrice })}
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
