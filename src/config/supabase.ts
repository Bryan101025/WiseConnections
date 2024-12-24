import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://klokqciuxouukmgickkl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtsb2txY2l1eG91dWttZ2lja2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5OTMwNjIsImV4cCI6MjA1MDU2OTA2Mn0.vVxiFRa0zrHN0Vx7eMLq85O-3OAGezlPhAfJR2iUISc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)