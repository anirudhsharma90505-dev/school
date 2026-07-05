import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fytjnjftsfrzzqsyttmf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5dGpuamZ0c2Zyenpxc3l0dG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMjI5NTIsImV4cCI6MjA5ODc5ODk1Mn0._wbxs992bZ1M0eWwSH7dWUvoRtsCldWE9U7he7JbNWI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Seeding students...");
  const { data: students, error: studentError } = await supabase.from('students').insert([
    { first_name: 'Aarav', last_name: 'Sharma', roll_number: 'ROLL-101', class_name: 'Class 10', section_name: 'A' },
    { first_name: 'Priya', last_name: 'Patel', roll_number: 'ROLL-102', class_name: 'Class 10', section_name: 'A' },
    { first_name: 'Rohan', last_name: 'Gupta', roll_number: 'ROLL-103', class_name: 'Class 9', section_name: 'B' },
    { first_name: 'Sneha', last_name: 'Reddy', roll_number: 'ROLL-104', class_name: 'Class 9', section_name: 'A' }
  ]).select();

  if (studentError) {
    console.error("Error seeding students:", studentError);
  } else {
    console.log("Students seeded successfully!");
  }

  console.log("Seeding teachers...");
  const { data: teachers, error: teacherError } = await supabase.from('teachers').insert([
    { first_name: 'Karan', last_name: 'Malhotra', subject: 'Mathematics', phone: '9876543210', email: 'karan@school.com' },
    { first_name: 'Anjali', last_name: 'Sen', subject: 'Physics', phone: '9876543211', email: 'anjali@school.com' },
    { first_name: 'Rajesh', last_name: 'Kumar', subject: 'Chemistry', phone: '9876543212', email: 'rajesh@school.com' }
  ]).select();

  if (teacherError) {
    console.error("Error seeding teachers:", teacherError);
  } else {
    console.log("Teachers seeded successfully!");
  }

  console.log("Seeding fees...");
  const { data: fees, error: feesError } = await supabase.from('fees').insert([
    { description: 'Tuition Fees (Dec-Jan)', amount: 12500, status: 'PENDING', student_name: 'Aarav Sharma', term: 'Academic Term 2 (2026)' },
    { description: 'Science Lab Component', amount: 1200, status: 'PENDING', student_name: 'Aarav Sharma', term: 'Academic Term 2 (2026)' },
    { description: 'Sports Tournament Entry', amount: 500, status: 'PAID', student_name: 'Aarav Sharma', term: 'Academic Term 2 (2026)' },
    { description: 'Annual Library Fee', amount: 2000, status: 'PAID', student_name: 'Priya Patel', term: 'Academic Term 2 (2026)' },
    { description: 'Tuition Fees (Dec-Jan)', amount: 12500, status: 'PENDING', student_name: 'Rohan Gupta', term: 'Academic Term 2 (2026)' }
  ]).select();

  if (feesError) {
    console.error("Error seeding fees:", feesError);
  } else {
    console.log("Fees seeded successfully!");
    
    // Seed payments for paid fees
    const paidFees = fees.filter(f => f.status === 'PAID');
    if (paidFees.length > 0) {
      console.log("Seeding fee payments...");
      const payments = paidFees.map(f => ({
        fee_id: f.id,
        amount: f.amount,
        notes: `Fee payment received from ${f.student_name}`
      }));
      const { error: payErr } = await supabase.from('fee_payments').insert(payments);
      if (payErr) {
        console.error("Error seeding payments:", payErr);
      } else {
        console.log("Fee payments seeded successfully!");
      }
    }
  }

  console.log("All tables seeded successfully!");
}

seed();
