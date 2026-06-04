const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://mndbyptvuaqasctphmgm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uZGJ5cHR2dWFxYXNjdHBobWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODk1MzUsImV4cCI6MjA4NjE2NTUzNX0.kGZJHHJvFetECau1uqTjG0JuiyC12i4XAny8AqdQprw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const athletes = JSON.parse(fs.readFileSync('athletes_data.json', 'utf8'));

async function importAthletes() {
    console.log(`Starting import of ${athletes.length} athletes...`);
    
    for (const athlete of athletes) {
        const { data, error } = await supabase
            .from('atletasbcv')
            .insert([athlete]); // Just insert
        
        if (error) {
            console.error(`Error importing ${athlete.nome}:`, error.message);
        } else {
            console.log(`Successfully imported/updated: ${athlete.nome}`);
        }
    }
    
    console.log("Import finished.");
}

importAthletes();
