// app/(tabs)/explore.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreatorRoutes } from '../../hooks/useCreatorRoutes';
import { useCommunityPins } from '../../hooks/useCommunityPins';
import { CreatorRouteSheet } from '../../components/CreatorRouteSheet';
import { CommunityPinModal } from '../../components/CommunityPinModal';
import type { CreatorRoute, CommunityPin } from '../../types/social';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { routes, saveRoute } = useCreatorRoutes();
  const { pins, addPin, loadInViewport } = useCommunityPins();

  const [showRoutes, setShowRoutes] = useState(true);
  const [showPins, setShowPins] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<CreatorRoute | null>(null);
  const [selectedPin, setSelectedPin] = useState<CommunityPin | null>(null);
  const [newPinCoord, setNewPinCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const cameraRef = React.useRef<MapboxGL.Camera>(null);

  const handleMapLongPress = (event: any) => {
    const coords = event.geometry?.coordinates;
    if (!coords) return;
    setNewPinCoord({ lat: coords[1], lng: coords[0] });
  };

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    setSearching(true);
    try {
      const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchText.trim())}.json?access_token=${token}&limit=1`
      );
      const json = await res.json();
      const feature = json.features?.[0];
      if (feature) {
        const [lng, lat] = feature.center;
        cameraRef.current?.setCamera({
          centerCoordinate: [lng, lat],
          zoomLevel: 10,
          animationDuration: 1000,
        });
      }
    } catch {}
    setSearching(false);
  };

  const handleRegionDidChange = async (feature: any) => {
    const bounds = feature.properties?.visibleBounds;
    if (!bounds) return;
    await loadInViewport({
      minLat: bounds[1][1],
      maxLat: bounds[0][1],
      minLng: bounds[1][0],
      maxLng: bounds[0][0],
    });
  };

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        onLongPress={handleMapLongPress}
        onRegionDidChange={handleRegionDidChange}
        accessibilityLabel="Explore map"
      >
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [0, 20],
            zoomLevel: 1.5,
          }}
        />

        {/* Creator route polylines */}
        {showRoutes && routes.map((route) => (
          <MapboxGL.ShapeSource
            key={`route-${route.id}`}
            id={`route-source-${route.id}`}
            shape={route.geojson as any}
            onPress={() => setSelectedRoute(route)}
          >
            <MapboxGL.LineLayer
              id={`route-line-${route.id}`}
              style={{
                lineColor: '#F5A623',
                lineWidth: 3,
                lineOpacity: 0.85,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </MapboxGL.ShapeSource>
        ))}

        {/* Community pin markers */}
        {showPins && pins.map((pin) => (
          <MapboxGL.PointAnnotation
            key={`pin-${pin.id}`}
            id={`pin-${pin.id}`}
            coordinate={[pin.lng, pin.lat]}
            onSelected={() => setSelectedPin(pin)}
          >
            <View style={styles.pinMarker}>
              <Text style={styles.pinEmoji}>📍</Text>
            </View>
          </MapboxGL.PointAnnotation>
        ))}
      </MapboxGL.MapView>

      {/* Search bar */}
      <View style={[styles.searchBar, { top: insets.top + 12 }]}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search destination..."
          placeholderTextColor="#9b9b96"
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          accessibilityLabel="Search map destination"
        />
        <TouchableOpacity
          onPress={handleSearch}
          disabled={searching}
          accessibilityLabel="Submit map search"
          accessibilityRole="button"
          style={styles.searchBtn}
        >
          {searching
            ? <ActivityIndicator size="small" color="#0F6E56" />
            : <Text style={{ fontSize: 16 }}>🔍</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Layer filter toggles */}
      <View style={styles.filterPanel}>
        <TouchableOpacity
          style={styles.filterItem}
          onPress={() => setShowRoutes((v) => !v)}
          accessibilityLabel={showRoutes ? 'Hide creator routes' : 'Show creator routes'}
        >
          <View style={[styles.routeLine, !showRoutes && styles.routeLineOff]} />
          <Text style={[styles.filterLabel, !showRoutes && styles.filterLabelOff]}>Routes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.filterItem}
          onPress={() => setShowPins((v) => !v)}
          accessibilityLabel={showPins ? 'Hide community pins' : 'Show community pins'}
        >
          <Text style={{ fontSize: 14 }}>📍</Text>
          <Text style={[styles.filterLabel, !showPins && styles.filterLabelOff]}>Pins</Text>
        </TouchableOpacity>
      </View>

      {/* Route detail sheet */}
      <CreatorRouteSheet
        route={selectedRoute}
        onClose={() => setSelectedRoute(null)}
        onSave={(id) => { saveRoute(id); setSelectedRoute(null); }}
      />

      {/* New pin modal (long press) */}
      {newPinCoord && (
        <CommunityPinModal
          visible={newPinCoord !== null}
          lat={newPinCoord.lat}
          lng={newPinCoord.lng}
          onClose={() => setNewPinCoord(null)}
          onSubmit={async (input) => { await addPin(input); setNewPinCoord(null); }}
        />
      )}

      {/* View existing pin */}
      {selectedPin && (
        <CommunityPinModal
          visible={selectedPin !== null}
          lat={selectedPin.lat}
          lng={selectedPin.lng}
          existingPin={selectedPin}
          onClose={() => setSelectedPin(null)}
          onSubmit={async () => {}}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  searchBar: {
    position: 'absolute',
    left: 16, right: 16,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
    alignItems: 'center', gap: 8,
    zIndex: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1a1a18' },
  searchBtn: { padding: 4 },
  pinMarker: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E8622A',
    borderWidth: 2, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  pinEmoji: { fontSize: 12 },
  filterPanel: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  filterItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeLine: { width: 14, height: 3, backgroundColor: '#F5A623', borderRadius: 2 },
  routeLineOff: { backgroundColor: '#ccc' },
  filterLabel: { fontSize: 12, color: '#111' },
  filterLabelOff: { color: '#aaa' },
});
