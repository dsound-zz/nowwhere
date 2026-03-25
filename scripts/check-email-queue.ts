import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkEmailQueue() {
  console.log('Checking email_queue table...\n')
  
  const { data, error } = await supabase
    .from('email_queue')
    .select('id, from_address, subject, status, received_at')
    .order('received_at', { ascending: false })
  
  if (error) {
    console.error('Error querying email_queue:', error)
    return
  }
  
  console.log(`Found ${data?.length || 0} records in email_queue:\n`)
  
  if (data && data.length > 0) {
    data.forEach((record, i) => {
      console.log(`${i + 1}. ${record.from_address}`)
      console.log(`   Subject: ${record.subject}`)
      console.log(`   Status: ${record.status}`)
      console.log(`   ID: ${record.id}`)
      console.log(`   Received: ${record.received_at}\n`)
    })
    
    // Delete all pending records
    console.log('Deleting all pending email_queue records...')
    const { error: deleteError } = await supabase
      .from('email_queue')
      .delete()
      .eq('status', 'pending')
    
    if (deleteError) {
      console.error('Error deleting records:', deleteError)
    } else {
      console.log('✅ Successfully deleted all pending email_queue records')
    }
  } else {
    console.log('✅ No records found - email_queue is empty')
  }
}

checkEmailQueue()
