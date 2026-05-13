import { useEffect, useState } from 'react'
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import * as Notifications from 'expo-notifications'
import {
  cancelAlarm,
  getScheduledAlarms,
  requestNotificationPermissions,
  scheduleAlarm,
} from '../lib/notifications'

interface Alarm {
  id: string
  hour: number
  minute: number
  label: string
  active: boolean
}

export default function AlarmScreen() {
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [hasPermission, setHasPermission] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerHour, setPickerHour] = useState(7)
  const [pickerMinute, setPickerMinute] = useState(0)

  useEffect(() => {
    setup()
  }, [])

  async function setup() {
    const granted = await requestNotificationPermissions()
    setHasPermission(granted)
    await loadAlarms()
  }

  async function loadAlarms() {
    const scheduled = await getScheduledAlarms()
    const parsed: Alarm[] = scheduled
      .filter(n => n.content.title?.startsWith('Alarm'))
      .map(n => {
        const trigger = n.trigger as any
        const date: Date = trigger?.value ? new Date(trigger.value) : new Date()
        return {
          id: n.identifier,
          hour: date.getHours(),
          minute: date.getMinutes(),
          label: n.content.body ?? 'Alarm',
          active: true,
        }
      })
    setAlarms(parsed)
  }

  async function addAlarm() {
    const now = new Date()
    const alarmDate = new Date()
    alarmDate.setHours(pickerHour, pickerMinute, 0, 0)
    if (alarmDate <= now) alarmDate.setDate(alarmDate.getDate() + 1)

    const label = `${String(pickerHour).padStart(2, '0')}:${String(pickerMinute).padStart(2, '0')}`
    const id = await scheduleAlarm(alarmDate, 'Alarm', label)
    setAlarms(prev => [...prev, { id, hour: pickerHour, minute: pickerMinute, label, active: true }])
    setShowPicker(false)
  }

  async function toggleAlarm(alarm: Alarm) {
    if (alarm.active) {
      await cancelAlarm(alarm.id)
      setAlarms(prev => prev.map(a => a.id === alarm.id ? { ...a, active: false } : a))
    } else {
      const now = new Date()
      const alarmDate = new Date()
      alarmDate.setHours(alarm.hour, alarm.minute, 0, 0)
      if (alarmDate <= now) alarmDate.setDate(alarmDate.getDate() + 1)
      const newId = await scheduleAlarm(alarmDate, 'Alarm', alarm.label)
      setAlarms(prev => prev.map(a => a.id === alarm.id ? { ...a, id: newId, active: true } : a))
    }
  }

  async function deleteAlarm(id: string) {
    await cancelAlarm(id)
    setAlarms(prev => prev.filter(a => a.id !== id))
  }

  function pad(n: number) { return String(n).padStart(2, '0') }

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
        keyExtractor={item => item.id}
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
              <Text style={styles.alarmLabel}>{item.label}</Text>
            </View>
            <View style={styles.alarmRight}>
              <Switch
                value={item.active}
                onValueChange={() => toggleAlarm(item)}
                trackColor={{ false: '#333', true: '#1d4ed8' }}
                thumbColor={item.active ? '#2563eb' : '#555'}
              />
              <TouchableOpacity onPress={() => deleteAlarm(item.id)} style={styles.deleteBtn}>
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

            <TouchableOpacity style={styles.confirmBtn} onPress={addAlarm}>
              <Text style={styles.confirmText}>Set Alarm</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPicker(false)}>
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
  timePicker: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 40 },
  pickerColumn: { alignItems: 'center', gap: 16 },
  pickerArrow: { color: '#2563eb', fontSize: 22, padding: 8 },
  pickerValue: { color: '#fff', fontSize: 56, fontWeight: '200', letterSpacing: 4, width: 80, textAlign: 'center' },
  pickerColon: { color: '#fff', fontSize: 48, fontWeight: '200', marginBottom: 8 },
  confirmBtn: { backgroundColor: '#2563eb', paddingHorizontal: 48, paddingVertical: 14, borderRadius: 12, marginBottom: 16 },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelText: { color: '#666', fontSize: 15 },
})
