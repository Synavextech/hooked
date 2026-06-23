const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Service Role Key in .env file");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@hooked.com';
  const password = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
  const password_hash = await bcrypt.hash(password, 10);
  
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          password_hash,
          names: 'System Admin',
          interaction_preference: 'just_chat',
          role: 'admin',
        }
      ])
      .select()
      .single();

    if (error) throw error;
    
    // Create an empty profile for the admin
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        { user_id: data.id }
      ]);
      
    if (profileError) throw profileError;

    console.log(`Admin user created successfully!`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    
  } catch (err) {
    console.error("Error creating admin user:", err.message || err);
  }
}

createAdmin();
