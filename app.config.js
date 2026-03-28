const base = require('./app.json')

module.exports = {
  ...base,
  expo: {
    ...base.expo,
    plugins: [
      'expo-router',
      'expo-dev-client',
      [
        '@rnmapbox/maps',
        { RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOADS_TOKEN ?? '' },
      ],
      'expo-apple-authentication',
      [
        'expo-location',
        { locationWhenInUsePermission: 'Wayfarer uses your location to show nearby places on the map.' },
      ],
    ],
    extra: {
      mapboxAccessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '',
    },
  },
}
