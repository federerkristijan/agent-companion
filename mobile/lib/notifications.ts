import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    })
  }
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function scheduleAlarm(
  date: Date,
  title: string,
  body = ''
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  })
}

export async function cancelAlarm(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id)
}

export async function getScheduledAlarms(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync()
}

export async function scheduleEventReminder(
  eventTitle: string,
  eventStart: string,
  minutesBefore = 30
): Promise<string | null> {
  const eventTime = new Date(eventStart).getTime()
  const reminderTime = new Date(eventTime - minutesBefore * 60_000)
  if (reminderTime <= new Date()) return null
  return scheduleAlarm(reminderTime, `Upcoming: ${eventTitle}`, `Starts in ${minutesBefore} minutes`)
}
