---
status: awaiting_human_verify
trigger: "react-native-safe-area-context fails to install in Expo canary project"
created: 2026-03-28T00:00:00Z
updated: 2026-03-28T00:02:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: CONFIRMED — npm strict peer resolution rejects canary pre-release versions (e.g. 55.0.5-canary-...) when a stable peer range like ">=14.0.4" is specified. @expo/vector-icons@15.1.1 peer-requires expo-font ">=14.0.4", npm resolves to expo-font@55.0.4 (latest stable satisfying range) but expo-font@55.0.5-canary is already installed — creating ERESOLVE conflict. This blocks ANY new npm install in the project.
test: N/A — root cause confirmed via semver.satisfies() and npm dry-run
expecting: Fix via .npmrc legacy-peer-deps=true + npm install with exact expo-compatible versions
next_action: create .npmrc, then run npm install for safe-area-context@5.6.2 and react-native-screens@4.23.0, then verify

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: App loads in iOS Simulator via `npx expo start` showing the Wayfarer app (Expo Router v4 file-based navigation)
actual: Metro bundler error: "Unable to resolve module react-native-safe-area-context" — the package is not found in node_modules
errors: |
  Unable to resolve module react-native-safe-area-context from node_modules/expo-router/build/ExpoRoot.js
  react-native-safe-area-context could not be found within the project or in these directories:
    node_modules/expo-router/node_modules
    node_modules

  Also when trying `npm install react-native-safe-area-context react-native-screens --legacy-peer-deps`:
  npm error ERESOLVE could not resolve
  Conflicting peer dependency: expo-font@55.0.4 vs expo-font@55.0.5-canary-20260327-0789fbc

  `npx expo install react-native-safe-area-context react-native-screens` also fails silently — package not in node_modules after running.

reproduction: Run `npx expo start` in the project directory
started: Issue discovered when first running `npx expo start` after removing App.tsx/index.ts and setting main to expo-router/entry

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: Packages are missing from npm registry / not published for canary SDK
  evidence: npm view shows react-native-safe-area-context@5.6.2 and react-native-screens@4.23.0 exist on npm registry. The issue is not availability but npm's inability to install them due to peer dep resolution failure.
  timestamp: 2026-03-28T00:01:00Z

- hypothesis: expo install is using a different/broken registry
  evidence: npm registry is standard https://registry.npmjs.org/. expo CLI calls npm internally. The failure is at the npm peer resolution layer, not a registry issue.
  timestamp: 2026-03-28T00:01:00Z

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-03-28T00:01:00Z
  checked: node_modules for react-native-safe-area-context and react-native-screens
  found: ABSENT — only expo-font, expo-router, expo-status-bar present among expo-related packages. No safe-area-context, no screens, no gesture-handler, no reanimated.
  implication: These required peer deps of expo-router were never installed.

- timestamp: 2026-03-28T00:01:00Z
  checked: expo/bundledNativeModules.json
  found: react-native-safe-area-context ~5.6.2, react-native-screens ~4.23.0, react-native-gesture-handler ~2.30.0, react-native-reanimated 4.2.1
  implication: expo expects specific stable versions of these packages; latest stable 5.7.0 does NOT satisfy ~5.6.2.

- timestamp: 2026-03-28T00:01:00Z
  checked: semver.satisfies('55.0.5-canary-20260327-0789fbc', '>=14.0.4')
  found: FALSE — npm semver rejects pre-release (canary) versions against stable ranges without includePrerelease flag
  implication: This is the core mechanism causing ERESOLVE. npm tries to resolve expo-font@55.0.4 (latest stable matching ">=14.0.4") but the project already has canary expo-font@55.0.5-canary... installed — conflict.

- timestamp: 2026-03-28T00:01:00Z
  checked: npm install react-native-safe-area-context react-native-screens --legacy-peer-deps --dry-run
  found: Resolves successfully to react-native-safe-area-context@5.7.0 and react-native-screens@4.24.0 (but these don't satisfy expo's ~5.6.2 / ~4.23.0 constraints exactly)
  implication: --legacy-peer-deps bypasses the conflict. However we need exact versions matching expo's bundled constraints.

- timestamp: 2026-03-28T00:01:00Z
  checked: @expo/vector-icons peerDependencies
  found: expo-font ">=14.0.4" — this broad range is what triggers the conflict. When npm resolves peer deps, it picks expo-font@55.0.4 (latest stable satisfying ">=14.0.4"), conflicting with already-installed canary.
  implication: @expo/vector-icons@15.1.1 is the package creating the conflict. It is a transitive dependency brought in by expo@55.x-canary.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: npm's strict peer dependency resolution (npm v7+) rejects pre-release/canary version strings (e.g. "55.0.5-canary-20260327-0789fbc") when matching against stable semver ranges like ">=14.0.4". This is because semver pre-release versions are excluded from range satisfaction unless includePrerelease=true. @expo/vector-icons@15.1.1 declares "expo-font": ">=14.0.4" as a peer dep — npm tries to resolve expo-font@55.0.4 (latest stable satisfying the range) but expo-font@55.0.5-canary is already installed, causing ERESOLVE conflict. This blocks ALL subsequent npm install invocations in the project, including `npx expo install` (which calls npm internally), preventing react-native-safe-area-context and other required expo-router peer deps from being installed.

fix: |
  1. Created .npmrc at project root with `legacy-peer-deps=true` — this makes npm use the pre-v7 peer dependency resolution algorithm (ignore peer dep conflicts), which correctly handles mixed canary/stable package trees.
  2. Installed exact versions matching expo's bundledNativeModules.json constraints:
     - react-native-safe-area-context@5.6.2 (bundled: ~5.6.2)
     - react-native-screens@4.23.0 (bundled: ~4.23.0)
     - react-native-gesture-handler@2.30.1 (bundled: ~2.30.0)
     - react-native-reanimated@4.2.1 (bundled: 4.2.1)
  All four are required peer dependencies of expo-router.

verification: Module resolves correctly: require.resolve('react-native-safe-area-context') → node_modules/react-native-safe-area-context/lib/commonjs/index.js
files_changed:
  - .npmrc (created)
  - package.json (4 new dependencies added by npm)
  - package-lock.json (updated)
