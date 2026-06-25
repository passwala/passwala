import React, { useEffect, useRef } from 'react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';

const GoogleMapWrapper = ({
  center = [23.0225, 72.5714],
  zoom = 13,
  markers = [],
  polylines = [],
  fitBoundsPoints = [],
  onClick = null,
  style = { height: '100%', width: '100%' }
}) => {
  const isLoaded = useGoogleMaps();
  const mapRef = useRef(null);
  const googleMapInstance = useRef(null);
  const activeMarkers = useRef([]);
  const activePolylines = useRef([]);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    // Initialize Map
    const mapOptions = {
      center: { lat: center[0], lng: center[1] },
      zoom: zoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      zoomControlOptions: {
        position: window.google?.maps?.ControlPosition?.RIGHT_TOP
      },
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        }
      ]
    };

    const map = new window.google.maps.Map(mapRef.current, {
      ...mapOptions,
      mapId: 'default' // required for AdvancedMarkerElement
    });
    googleMapInstance.current = map;

    // Handle map click
    if (onClick) {
      map.addListener('click', (e) => {
        onClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      });
    }

    return () => {
      if (window.google && window.google.maps) {
        window.google.maps.event.clearInstanceListeners(map);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // Center/Zoom Update
  useEffect(() => {
    if (googleMapInstance.current && center) {
      googleMapInstance.current.setCenter({ lat: center[0], lng: center[1] });
    }
  }, [center]);

  // Markers Update
  useEffect(() => {
    if (!googleMapInstance.current || !isLoaded) return;

    // Clean up existing markers
    activeMarkers.current.forEach(m => m.setMap(null));
    activeMarkers.current = [];

    // Create new markers
    markers.forEach(markerInfo => {
      if (!markerInfo.position || isNaN(markerInfo.position[0]) || isNaN(markerInfo.position[1])) return;

      const position = { lat: markerInfo.position[0], lng: markerInfo.position[1] };

      // Use AdvancedMarkerElement if available (modern API), fallback to legacy Marker
      const AdvancedMarkerElement = window.google?.maps?.marker?.AdvancedMarkerElement;

      let marker;
      if (AdvancedMarkerElement) {
        // Build custom pin element for SVG icons
        let content;
        if (markerInfo.svgIcon) {
          const img = document.createElement('img');
          img.src = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerInfo.svgIcon);
          img.style.width = (markerInfo.iconSize?.[0] || 32) + 'px';
          img.style.height = (markerInfo.iconSize?.[1] || 32) + 'px';
          content = img;
        }
        marker = new AdvancedMarkerElement({
          map: googleMapInstance.current,
          position,
          title: markerInfo.title || '',
          ...(content ? { content } : {})
        });
      } else {
        // Legacy Marker fallback
        const markerOptions = {
          position,
          map: googleMapInstance.current,
          title: markerInfo.title || '',
        };
        if (markerInfo.svgIcon) {
          markerOptions.icon = {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerInfo.svgIcon),
            scaledSize: new window.google.maps.Size(markerInfo.iconSize?.[0] || 32, markerInfo.iconSize?.[1] || 32),
            anchor: markerInfo.iconAnchor
              ? new window.google.maps.Point(markerInfo.iconAnchor[0], markerInfo.iconAnchor[1])
              : undefined
          };
        }
        marker = new window.google.maps.Marker(markerOptions);
      }

      if (markerInfo.title) {
        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div style="color:#0f172a;font-family:sans-serif;font-size:13px;font-weight:600;padding:4px 8px;">${markerInfo.title}</div>`
        });
        marker.addListener('click', () => {
          infoWindow.open(googleMapInstance.current, marker);
        });
      }

      if (markerInfo.onClick) {
        marker.addListener('click', markerInfo.onClick);
      }

      activeMarkers.current.push(marker);
    });
  }, [markers, isLoaded]);

  // Polylines Update
  useEffect(() => {
    if (!googleMapInstance.current || !isLoaded) return;

    // Clean up existing polylines
    activePolylines.current.forEach(p => p.setMap(null));
    activePolylines.current = [];

    polylines.forEach(polyInfo => {
      if (!polyInfo.path || polyInfo.path.length < 2) return;

      const pathCoords = polyInfo.path.map(pt => ({ lat: pt[0], lng: pt[1] }));
      const isDashed = polyInfo.style === 'dashed' || polyInfo.dashArray;

      const polyOptions = {
        path: pathCoords,
        geodesic: true,
        strokeColor: polyInfo.color || '#3b82f6',
        strokeOpacity: 0.8,
        strokeWeight: polyInfo.weight || 4,
        map: googleMapInstance.current
      };

      if (isDashed) {
        polyOptions.strokeOpacity = 0;
        polyOptions.icons = [{
          icon: {
            path: 'M 0,-1 0,1',
            strokeOpacity: 0.8,
            strokeColor: polyInfo.color || '#3b82f6',
            scale: 2
          },
          offset: '0',
          repeat: '15px'
        }];
      }

      const polylineInstance = new window.google.maps.Polyline(polyOptions);
      activePolylines.current.push(polylineInstance);
    });
  }, [polylines, isLoaded]);

  // Bounds fitting
  useEffect(() => {
    if (!googleMapInstance.current || !isLoaded || !fitBoundsPoints || fitBoundsPoints.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    let validPointsCount = 0;

    fitBoundsPoints.forEach(pt => {
      if (pt && !isNaN(pt[0]) && !isNaN(pt[1])) {
        bounds.extend({ lat: pt[0], lng: pt[1] });
        validPointsCount++;
      }
    });

    if (validPointsCount > 0) {
      // Small timeout to ensure container is fully sized
      setTimeout(() => {
        if (googleMapInstance.current) {
          googleMapInstance.current.fitBounds(bounds);
          // If only 1 point, center and set reasonable zoom
          if (validPointsCount === 1) {
            googleMapInstance.current.setZoom(15);
          }
        }
      }, 100);
    }
  }, [fitBoundsPoints, isLoaded]);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const keyMissing = !apiKey || apiKey.includes('YOUR_');

  if (keyMissing) {
    return (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: 12, flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 28 }}>🗺️</span>
        <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Map preview unavailable</span>
        <span style={{ color: '#94a3b8', fontSize: 11 }}>Add VITE_GOOGLE_MAPS_API_KEY to .env</span>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#64748b' }}>
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ff6b00]"></div>
          <span className="text-sm font-semibold">Loading map...</span>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} style={style} />;
};

export default GoogleMapWrapper;
