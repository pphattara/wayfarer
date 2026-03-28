// app/(tabs)/explore.tsx
import { useState } from 'react'
import { View, StyleSheet, Pressable, Text, Linking } from 'react-native'
import MapboxGL from '@rnmapbox/maps'
import Constants from 'expo-constants'

MapboxGL.setAccessToken(Constants.expoConfig?.extra?.mapboxAccessToken ?? '')

export default function ExploreTab() {
  const [selectedCoord, setSelectedCoord] = useState<[number, number] | null>(null)

  function handleMapPress(e: any) {
    const coord = e.geometry.coordinates as [number, number]
    setSelectedCoord(coord)
  }

  function openInGoogleMaps() {
    if (!selectedCoord) return
    const [lng, lat] = selectedCoord
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`)
  }

  return (
    <View style={styles.container}>
      <MapboxGL.MapView style={styles.map} onPress={handleMapPress}>
        <MapboxGL.Camera
          zoomLevel={12}
          centerCoordinate={[0, 51.5]} // default: London
          animationMode="flyTo"
        />

        {selectedCoord && (
          <MapboxGL.PointAnnotation id="selected" coordinate={selectedCoord}>
            <View style={styles.pin} />
          </MapboxGL.PointAnnotation>
        )}
      </MapboxGL.MapView>

      {selectedCoord && (
        <View style={styles.bottomSheet}>
          <Text style={styles.coordText}>
            {selectedCoord[1].toFixed(5)}, {selectedCoord[0].toFixed(5)}
          </Text>
          <Pressable style={styles.gmapsButton} onPress={openInGoogleMaps}>
            <Text style={styles.gmapsText}>Open in Google Maps →</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  pin: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#0F6E56', borderWidth: 2, borderColor: '#fff' },
  bottomSheet: { position: 'absolute', bottom: 80, left: 16, right: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  coordText: { fontSize: 13, color: '#888', marginBottom: 10 },
  gmapsButton: { backgroundColor: '#f0f7f4', borderRadius: 10, padding: 12, alignItems: 'center' },
  gmapsText: { color: '#0F6E56', fontWeight: '700', fontSize: 15 },
})
