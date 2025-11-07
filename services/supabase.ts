
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dzzaitjvtwdmwinzxwzu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6emFpdGp2dHdkbXdpbnp4d3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMjc1NjUsImV4cCI6MjA3NzYwMzU2NX0.3uCpKBlRPjiF_JE-R7jkfQhsITgjTDayBWdAebAn1kc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
