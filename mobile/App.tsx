import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import HomeScreen from './screens/HomeScreen'
import ChatScreen from './screens/ChatScreen'
import CalendarScreen from './screens/CalendarScreen'
import AlarmScreen from './screens/AlarmScreen'

const Tab = createBottomTabNavigator()

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#0f0f0f' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '600' },
            tabBarStyle: { backgroundColor: '#0f0f0f', borderTopColor: '#1e1e1e' },
            tabBarActiveTintColor: '#2563eb',
            tabBarInactiveTintColor: '#666',
          }}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{ tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size} /> }}
          />
          <Tab.Screen
            name="Chat"
            component={ChatScreen}
            options={{ tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} color={color} size={size} /> }}
          />
          <Tab.Screen
            name="Calendar"
            component={CalendarScreen}
            options={{ tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'calendar' : 'calendar-outline'} color={color} size={size} /> }}
          />
<Tab.Screen
            name="Alarms"
            component={AlarmScreen}
            options={{ tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'alarm' : 'alarm-outline'} color={color} size={size} /> }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}
