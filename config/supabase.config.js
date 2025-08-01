const { createClient } = require('@supabase/supabase-js')
const config = require('../supabase-service-account.json')

const supabase = createClient(
  config.supabase_url,
  config.supabase_service_role_key
)

module.exports = supabase

