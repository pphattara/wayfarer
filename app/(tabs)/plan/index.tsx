// app/(tabs)/plan/index.tsx
import { useState, useRef } from 'react'
import {
  View, Text, TextInput, StyleSheet, Pressable, Alert,
  ScrollView, Modal, TouchableWithoutFeedback, FlatList,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useTrip } from '../../../hooks/useTrip'
import { useAuth } from '../../../hooks/useAuth'

// ─── City list ────────────────────────────────────────────────────────────────
const CITIES = [
  'Bangkok, Thailand','London, UK','Paris, France','Tokyo, Japan',
  'New York, USA','Dubai, UAE','Singapore','Rome, Italy',
  'Barcelona, Spain','Amsterdam, Netherlands','Sydney, Australia',
  'Istanbul, Turkey','Prague, Czech Republic','Vienna, Austria',
  'Bali, Indonesia','Kuala Lumpur, Malaysia','Hong Kong',
  'Seoul, South Korea','Beijing, China','Shanghai, China',
  'Mumbai, India','Delhi, India','Cairo, Egypt','Nairobi, Kenya',
  'Cape Town, South Africa','Los Angeles, USA','Miami, USA',
  'Toronto, Canada','Mexico City, Mexico','São Paulo, Brazil',
  'Buenos Aires, Argentina','Lisbon, Portugal','Madrid, Spain',
  'Berlin, Germany','Munich, Germany','Zurich, Switzerland',
  'Stockholm, Sweden','Copenhagen, Denmark','Oslo, Norway',
  'Athens, Greece','Budapest, Hungary','Warsaw, Poland',
  'Marrakech, Morocco','Doha, Qatar','Abu Dhabi, UAE',
  'Osaka, Japan','Kyoto, Japan','Phuket, Thailand','Chiang Mai, Thailand',
]

// ─── Calendar ─────────────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const WEEKDAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']

type CalStage = 'year' | 'month' | 'day'

function CalendarPicker({
  value, onChange, startYear, startMonth,
}: {
  value: string
  onChange: (d: string) => void
  startYear?: number   // which year to open on
  startMonth?: number  // which month to open on (0-indexed)
}) {
  const today = new Date()
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  // Default view: startYear/startMonth if provided, else today
  const initYear  = startYear  ?? today.getFullYear()
  const initMonth = startMonth ?? today.getMonth()

  const [stage, setStage] = useState<CalStage>('day')
  const [viewYear,  setViewYear]  = useState(initYear)
  const [viewMonth, setViewMonth] = useState(initMonth)

  const currentYear = today.getFullYear()
  const years = Array.from({ length: 6 }, (_, i) => currentYear + i)

  function toDateStr(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
  function firstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay() }

  const totalDays = daysInMonth(viewYear, viewMonth)
  const startPad  = firstDayOfMonth(viewYear, viewMonth)
  const cells: (number | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  // ── Year stage ──
  if (stage === 'year') {
    return (
      <View style={cal.container}>
        <Text style={cal.stageTitle}>Select year</Text>
        <View style={cal.yearGrid}>
          {years.map(y => (
            <Pressable
              key={y}
              style={[cal.yearCell, y === viewYear && cal.yearCellSelected]}
              onPress={() => { setViewYear(y); setStage('month') }}
            >
              <Text style={[cal.yearText, y === viewYear && cal.yearTextSelected]}>{y}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    )
  }

  // ── Month stage ──
  if (stage === 'month') {
    return (
      <View style={cal.container}>
        <Pressable onPress={() => setStage('year')} style={cal.backRow}>
          <Text style={cal.backText}>‹ {viewYear}</Text>
        </Pressable>
        <Text style={cal.stageTitle}>Select month</Text>
        <View style={cal.monthGrid}>
          {MONTHS.map((m, idx) => (
            <Pressable
              key={m}
              style={[cal.monthCell, idx === viewMonth && cal.monthCellSelected]}
              onPress={() => { setViewMonth(idx); setStage('day') }}
            >
              <Text style={[cal.monthText, idx === viewMonth && cal.monthTextSelected]}>
                {MONTH_SHORT[idx]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    )
  }

  // ── Day stage ──
  return (
    <View style={cal.container}>
      {/* Nav row */}
      <View style={cal.nav}>
        <Pressable
          onPress={() => {
            if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
            else setViewMonth(m => m - 1)
          }}
          style={cal.navBtn}
        >
          <Text style={cal.navArrow}>‹</Text>
        </Pressable>

        <Pressable onPress={() => setStage('month')} style={cal.monthYearBtn}>
          <Text style={cal.monthYearText}>{MONTH_SHORT[viewMonth]} {viewYear}</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
            else setViewMonth(m => m + 1)
          }}
          style={cal.navBtn}
        >
          <Text style={cal.navArrow}>›</Text>
        </Pressable>
      </View>

      {/* Weekday headers */}
      <View style={cal.dayHeaders}>
        {WEEKDAYS.map(d => <Text key={d} style={cal.dayHeader}>{d}</Text>)}
      </View>

      {/* Day grid */}
      <View style={cal.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`e-${idx}`} style={cal.cell} />
          const dateStr = toDateStr(viewYear, viewMonth, day)
          const isSelected = dateStr === value
          const isToday    = dateStr === todayStr
          const isPast     = dateStr < todayStr
          return (
            <Pressable
              key={dateStr}
              style={[cal.cell, isSelected && cal.cellSelected, isPast && cal.cellDisabled]}
              onPress={() => !isPast && onChange(dateStr)}
              disabled={isPast}
            >
              <Text style={[
                cal.dayNum,
                isSelected && cal.dayNumSelected,
                isToday && !isSelected && cal.dayNumToday,
                isPast && cal.dayNumDisabled,
              ]}>
                {day}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

// ─── City autocomplete (uses Modal so dropdown is always on top) ──────────────
function CityInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [anchorY, setAnchorY] = useState(0)
  const inputRef = useRef<View>(null)

  const filtered = value.length > 0
    ? CITIES.filter(c => c.toLowerCase().includes(value.toLowerCase())).slice(0, 6)
    : []

  function measureAndOpen() {
    inputRef.current?.measure((_x, _y, _w, _h, _px, py) => {
      setAnchorY(py + 48)
      setOpen(true)
    })
  }

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View ref={inputRef}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9b9b96"
          value={value}
          onChangeText={v => { onChange(v); if (v.length > 0) measureAndOpen(); else setOpen(false) }}
          onFocus={measureAndOpen}
          autoCorrect={false}
          autoCapitalize="words"
        />
      </View>

      {open && filtered.length > 0 && (
        <Modal transparent visible animationType="none" onRequestClose={() => setOpen(false)}>
          <TouchableWithoutFeedback onPress={() => setOpen(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <View style={[styles.dropdown, { top: anchorY }]}>
            {filtered.map(city => (
              <Pressable
                key={city}
                style={styles.dropdownItem}
                onPress={() => { onChange(city); setOpen(false) }}
              >
                <Text style={styles.dropdownText}>{city}</Text>
              </Pressable>
            ))}
          </View>
        </Modal>
      )}
    </View>
  )
}

// ─── Date input with calendar modal ──────────────────────────────────────────
function DateInput({ label, value, onChange, startYear, startMonth }: {
  label: string
  value: string
  onChange: (v: string) => void
  startYear?: number
  startMonth?: number
}) {
  const [open, setOpen] = useState(false)

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.dateInput} onPress={() => setOpen(true)}>
        <Text style={value ? styles.dateText : styles.datePlaceholder}>
          {value || 'Select date'}
        </Text>
        <Text style={styles.calIcon}>📅</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.calBackdrop} />
        </TouchableWithoutFeedback>
        <View style={styles.calModal}>
          <View style={styles.calHandle} />
          <CalendarPicker
            value={value}
            onChange={d => { onChange(d); setOpen(false) }}
            startYear={startYear}
            startMonth={startMonth}
          />
        </View>
      </Modal>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function TripSetupScreen() {
  const router = useRouter()
  const { createTrip } = useTrip()
  const { user } = useAuth()

  const [tripName, setTripName]       = useState('')
  const [origin, setOrigin]           = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate]     = useState('')
  const [endDate, setEndDate]         = useState('')
  const [loading, setLoading]         = useState(false)

  // Return date calendar starts at the month AFTER departure
  const returnStart = (() => {
    if (!startDate) return undefined
    const d = new Date(startDate + 'T00:00:00')
    const nextMonth = d.getMonth() === 11 ? 0 : d.getMonth() + 1
    const nextYear  = d.getMonth() === 11 ? d.getFullYear() + 1 : d.getFullYear()
    return { year: nextYear, month: nextMonth }
  })()

  function validate(): string | null {
    if (!origin.trim())      return 'Please enter your origin city.'
    if (!destination.trim()) return 'Please enter a destination.'
    if (!startDate)          return 'Please select a departure date.'
    if (!endDate)            return 'Please select a return date.'
    if (new Date(endDate) <= new Date(startDate)) return 'Return date must be after departure.'
    return null
  }

  async function handleNext() {
    const err = validate()
    if (err) return Alert.alert('Check your input', err)
    setLoading(true)
    try {
      const trip = await createTrip({
        trip_name: tripName.trim() || undefined,
        origin: origin.trim(),
        destinations: [destination.trim()],
        start_date: startDate,
        end_date: endDate,
      })
      router.push({
        pathname: '/(tabs)/plan/interests',
        params: { tripId: trip.id, destination: destination.trim(), origin: origin.trim(), startDate, endDate },
      })
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Trip Planner</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(1 / 6) * 100}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.aiBubble}>
          <Text style={styles.aiBubbleText}>
            Hi{user?.display_name ? ` ${user.display_name}` : ''}! Let's plan your next trip.
          </Text>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Trip name (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Summer in Tokyo"
            placeholderTextColor="#9b9b96"
            value={tripName}
            onChangeText={setTripName}
          />
        </View>

        <CityInput label="From" value={origin} onChange={setOrigin} placeholder="e.g. London, UK" />
        <CityInput label="Destination" value={destination} onChange={setDestination} placeholder="e.g. Tokyo, Japan" />

        <DateInput label="Departure date" value={startDate} onChange={d => { setStartDate(d); setEndDate('') }} />
        <DateInput
          label="Return date"
          value={endDate}
          onChange={setEndDate}
          startYear={returnStart?.year}
          startMonth={returnStart?.month}
        />

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Creating trip…' : 'Next →'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f5f2' },
  header: { backgroundColor: '#0F6E56', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 16 },
  headerTitle: { fontSize: 13, fontWeight: '600', color: '#fff' },
  progressTrack: { height: 3, backgroundColor: 'rgba(0,0,0,0.08)' },
  progressFill: { height: 3, backgroundColor: '#0F6E56' },
  container: { padding: 16, paddingTop: 20, paddingBottom: 40 },
  aiBubble: { backgroundColor: '#E1F5EE', borderRadius: 10, padding: 12, marginBottom: 20 },
  aiBubbleText: { fontSize: 13, color: '#04342C', lineHeight: 18 },

  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 11, color: '#6b6b66', marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    fontSize: 14, color: '#1a1a18', borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)',
  },

  // Dropdown rendered in Modal — position absolute from screen top
  dropdown: {
    position: 'absolute', left: 16, right: 16,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 20,
  },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f2' },
  dropdownText: { fontSize: 14, color: '#1a1a18' },

  dateInput: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dateText: { fontSize: 14, color: '#1a1a18' },
  datePlaceholder: { fontSize: 14, color: '#9b9b96' },
  calIcon: { fontSize: 16 },

  calBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  calModal: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 48,
  },
  calHandle: { width: 40, height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },

  button: {
    backgroundColor: '#0F6E56', borderRadius: 12, height: 50,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})

const cal = StyleSheet.create({
  container: {},
  stageTitle: { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 16, textAlign: 'center' },

  // Year grid
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  yearCell: {
    flex: 1, minWidth: '28%', paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#f5f5f2', alignItems: 'center',
  },
  yearCellSelected: { backgroundColor: '#0F6E56' },
  yearText: { fontSize: 16, fontWeight: '700', color: '#333' },
  yearTextSelected: { color: '#fff' },

  // Month grid
  backRow: { marginBottom: 8 },
  backText: { fontSize: 14, color: '#0F6E56', fontWeight: '600' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthCell: {
    width: '22%', paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#f5f5f2', alignItems: 'center',
  },
  monthCellSelected: { backgroundColor: '#0F6E56' },
  monthText: { fontSize: 14, fontWeight: '600', color: '#333' },
  monthTextSelected: { color: '#fff' },

  // Day grid
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { padding: 8 },
  navArrow: { fontSize: 24, color: '#0F6E56', fontWeight: '600' },
  monthYearBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f0faf7', borderRadius: 8 },
  monthYearText: { fontSize: 15, fontWeight: '800', color: '#0F6E56' },
  dayHeaders: { flexDirection: 'row', marginBottom: 4 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 11, color: '#9b9b96', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  cellSelected: { backgroundColor: '#0F6E56', borderRadius: 100 },
  cellDisabled: { opacity: 0.3 },
  dayNum: { fontSize: 14, color: '#111', fontWeight: '500' },
  dayNumSelected: { color: '#fff', fontWeight: '800' },
  dayNumToday: { color: '#0F6E56', fontWeight: '800' },
  dayNumDisabled: { color: '#bbb' },
})
