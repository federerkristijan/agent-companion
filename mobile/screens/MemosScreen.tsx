import { StyleSheet, Text, View } from 'react-native'

export default function MemosScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Memos — coming soon</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#666', fontSize: 16 },
})
