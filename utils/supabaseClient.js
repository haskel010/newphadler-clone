const { createClient } = require("@supabase/supabase-js");




// Create a single supabase client for interacting with your database
const supabase = createClient('https://gqxjhftrvdioloqauflj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeGpoZnRydmRpb2xvcWF1ZmxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODA4Njg2OCwiZXhwIjoyMDUzNjYyODY4fQ.o61MqMk-9IRddSQqRAzhaQnujcj7GZb1PqPszR8kZZQ')

module.exports = supabase