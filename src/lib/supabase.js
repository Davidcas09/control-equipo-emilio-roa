import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xerzrexqtqcrlbdldfrd.supabase.co'
const supabaseKey = 'sb_publishable_3QyN2kWtzQIbJz-JdRnUgw_Z8gAnA4Z'

export const supabase = createClient(supabaseUrl, supabaseKey)