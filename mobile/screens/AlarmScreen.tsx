import { useEffect, useState } from 'react'
import {
  FlatList,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  cancelAlarm,
  requestNotificationPermissions,
  scheduleAlarm,
  scheduleWeeklyAlarm,
} from '../lib/notifications'

const STORAGE_KEY = 'alarms'
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface Alarm {
  alarmId: string
  ids: string[]
  hour: number
  minute: number
  label: string
  active: boolean
  days: number[] // 0=Sun, 1=Mon, ..., 6=Sat; empty = one-time
}

export default function AlarmScreen() {
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [hasPermission, setHasPermission] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerHour, setPickerHour] = useState(7)
  const [pickerMinute, setPickerMinute] = useState(0)
  const [pickerDays, setPickerDays] = useState<number[]>([])

  useEffect(() => {
    setup()
  }, [])

  async function setup() {
    const granted = await requestNotificationPermissions()
    setHasPermission(granted)
    await loadAlarms()
  }

  async function loadAlarms() {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (raw) setAlarms(JSON.parse(raw))
  }

  async function saveAlarms(updated: Alarm[]) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  function toggleDay(day: number) {
    setPickerDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  async function addAlarm() {
    const label = `${pad(pickerHour)}:${pad(pickerMinute)}`
    let ids: string[]

    if (pickerDays.length === 0) {
      const now = new Date()
      const alarmDate = new Date()
      alarmDate.setHours(pickerHour, pickerMinute, 0, 0)
      if (alarmDate <= now) alarmDate.setDate(alarmDate.getDate() + 1)
      ids = [await scheduleAlarm(alarmDate, 'Alarm', label)]
    } else {
      ids = await Promise.all(
        pickerDays.map(day =>
          scheduleWeeklyAlarm(pickerHour, pickerMinute, day + 1, 'Alarm', label)
        )
      )
    }

    const alarm: Alarm = {
      alarmId: Date.now().toString(),
      ids,
      hour: pickerHour,
      minute: pickerMinute,
      label,
      active: true,
      days: [...pickerDays].sort(),
    }

    const updated = [...alarms, alarm]
    setAlarms(updated)
    await saveAlarms(updated)
    setShowPicker(false)
    setPickerDays([])
  }

  async function toggleAlarm(alarm: Alarm) {
    let updated: Alarm[]
    if (alarm.active) {
      await Promise.all(alarm.ids.map(cancelAlarm))
      updated = alarms.map(a =>
        a.alarmId === alarm.alarmId ? { ...a, active: false } : a
      )
    } else {
      let newIds: string[]
      if (alarm.days.length === 0) {
        const now = new Date()
        const alarmDate = new Date()
        alarmDate.setHours(alarm.hour, alarm.minute, 0, 0)
        if (alarmDate <= now) alarmDate.setDate(alarmDate.getDate() + 1)
        newIds = [await scheduleAlarm(alarmDate, 'Alarm', alarm.label)]
      } else {
        newIds = await Promise.all(
          alarm.days.map(day =>
            scheduleWeeklyAlarm(alarm.hour, alarm.minute, day + 1, 'Alarm', alarm.label)
          )
        )
      }
      updated = alarms.map(a =>
        a.alarmId === alarm.alarmId ? { ...a, ids: newIds, active: true } : a
      )
    }
    setAlarms(updated)
    await saveAlarms(updated)
  }

  async function deleteAlarm(alarm: Alarm) {
    await Promise.all(alarm.ids.map(cancelAlarm))
    const updated = alarms.filter(a => a.alarmId !== alarm.alarmId)
    setAlarms(updated)
    await saveAlarms(updated)
  }

  function pad(n: number) { return String(n).padStart(2, '0') }

  function daysLabel(days: number[]): string {
    if (days.length === 0) return 'One time'
    if (days.length === 7) return 'Every day'
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays'
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends'
    return days.map(d => DAY_NAMES[d]).join(', ')
  }

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.heading}>Notifications Required</Text>
        <Text style={styles.sub}>Enable notifications in device settings to use alarms</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={alarms}
        keyExtractor={item => item.alarmId}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No alarms set{'\n'}Tap + to add one</Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.alarmCard, !item.active && styles.alarmCardInactive]}>
            <View style={styles.alarmLeft}>
              <Text style={[styles.alarmTime, !item.active && styles.alarmTimeInactive]}>
                {pad(item.hour)}:{pad(item.minute)}
              </Text>
              <Text style={styles.alarmLabel}>{daysLabel(item.days)}</Text>
            </View>
            <View style={styles.alarmRight}>
              <Switch
                value={item.active}
                onValueChange={() => toggleAlarm(item)}
                trackColor={{ false: '#333', true: '#1d4ed8' }}
                thumbColor={item.active ? '#2563eb' : '#555'}
              />
              <TouchableOpacity onPress={() => deleteAlarm(item)} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowPicker(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Alarm</Text>

            <View style={styles.timePicker}>
              <View style={styles.pickerColumn}>
                <TouchableOpacity onPress={() => setPickerHour(h => (h + 1) % 24)}>
                  <Text style={styles.pickerArrow}>▲</Text>
                </TouchableOpacity>
                <Text style={styles.pickerValue}>{pad(pickerHour)}</Text>
                <TouchableOpacity onPress={() => setPickerHour(h => (h - 1 + 24) % 24)}>
                  <Text style={styles.pickerArrow}>▼</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.pickerColon}>:</Text>
              <View style={styles.pickerColumn}>
                <TouchableOpacity onPress={() => setPickerMinute(m => (m + 5) % 60)}>
                  <Text style={styles.pickerArrow}>▲</Text>
                </TouchableOpacity>
                <Text style={styles.pickerValue}>{pad(pickerMinute)}</Text>
                <TouchableOpacity onPress={() => setPickerMinute(m => (m - 5 + 60) % 60)}>
                  <Text style={styles.pickerArrow}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.repeatLabel}>Repeat</Text>
            <View style={styles.daySelector}>
              {DAY_LABELS.map((label, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.dayBtn, pickerDays.includes(i) && styles.dayBtnActive]}
                  onPress={() => toggleDay(i)}
                >
                  <Text style={[styles.dayText, pickerDays.includes(i) && styles.dayTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={addAlarm}>
              <Text style={styles.confirmText}>Set Alarm</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowPicker(false); setPickerDays([]) }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  center: { flex: 1, backgroundColor: '#0f0f0f', alignItems: 'center', justifyContent: 'center', padding: 24 },
  heading: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  sub: { color: '#666', fontSize: 14, textAlign: 'center' },
  empty: { color: '#444', textAlign: 'center', marginTop: 80, fontSize: 16, lineHeight: 28 },
  alarmCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  alarmCardInactive: { opacity: 0.5 },
  alarmLeft: { flex: 1 },
  alarmTime: { color: '#fff', fontSize: 40, fontWeight: '200', letterSpacing: 2 },
  alarmTimeInactive: { color: '#444' },
  alarmLabel: { color: '#666', fontSize: 13, marginTop: 2 },
  alarmRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deleteBtn: { padding: 8 },
  deleteText: { color: '#555', fontSize: 16 },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 36 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#161616', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 32, alignItems: 'center' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 32 },
  timePicker: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 },
  pickerColumn: { alignItems: 'center', gap: 16 },
  pickerArrow: { color: '#2563eb', fontSize: 22, padding: 8 },
  pickerValue: { color: '#fff', fontSize: 56, fontWeight: '200', letterSpacing: 4, width: 80, textAlign: 'center' },
  pickerColon: { color: '#fff', fontSize: 48, fontWeight: '200', marginBottom: 8 },
  repeatLabel: { color: '#888', fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', alignSelf: 'flex-start', marginBottom: 12 },
  daySelector: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  dayBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  dayBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  dayText: { color: '#666', fontSize: 13, fontWeight: '600' },
  dayTextActive: { color: '#fff' },
  confirmBtn: { backgroundColor: '#2563eb', paddingHorizontal: 48, paddingVertical: 14, borderRadius: 12, marginBottom: 16, width: '100%', alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelText: { color: '#666', fontSize: 15 },
})
