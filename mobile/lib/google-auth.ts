import * as SecureStore from 'expo-secure-store'
import * as WebBrowser from 'expo-web-browser'

WebBrowser.maybeCompleteAuthSession()

const ACCESS_TOKEN_KEY = 'google_access_token'
const TOKEN_EXPIRY_KEY = 'google_token_expiry'
const USER_EMAIL_KEY = 'google_user_email'

export async function storeGoogleToken(
  accessToken: string,
  expiresIn: number,
  email?: string
): Promise<void> {
  const expiry = (Date.now() + expiresIn * 1000).toString()
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken)
  await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiry)
  if (email) await SecureStore.setItemAsync(USER_EMAIL_KEY, email)
}

export async function getValidAccessToken(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY)
  const expiry = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY)
  if (!token || !expiry) return null
  if (Date.now() > parseInt(expiry) - 60_000) return null  // treat as expired 1min early
  return token
}

export async function getStoredEmail(): Promise<string | null> {
  return SecureStore.getItemAsync(USER_EMAIL_KEY)
}

export async function clearGoogleSession(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY)
  await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY)
  await SecureStore.deleteItemAsync(USER_EMAIL_KEY)
}

export async function isSignedIn(): Promise<boolean> {
  const token = await getValidAccessToken()
  return token !== null
}
