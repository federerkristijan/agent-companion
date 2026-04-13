import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { Text } from 'react-native'
import HomeScreen from './screens/HomeScreen'
import ChatScreen from './screens/ChatScreen'
import CalendarScreen from './screens/CalendarScreen'
import MemosScreen from './screens/MemosScreen'

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
            options={{ tabBarIcon: () => <Text>🏠</Text> }}
          />
          <Tab.Screen
            name="Chat"
            component={ChatScreen}
            options={{ tabBarIcon: () => <Text>💬</Text> }}
          />
          <Tab.Screen
            name="Calendar"
            component={CalendarScreen}
            options={{ tabBarIcon: () => <Text>📅</Text> }}
          />
          <Tab.Screen
            name="Memos"
            component={MemosScreen}
            options={{ tabBarIcon: () => <Text>📝</Text> }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}
