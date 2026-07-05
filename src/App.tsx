import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Users, 
  CreditCard, 
  BarChart3, 
  Settings as SettingsIcon, 
  Search, 
  Bell, 
  AlertTriangle, 
  DollarSign, 
  Zap, 
  Wrench, 
  X,
  Database,
  Plus,
  Trash2,
  CheckCircle,
  Copy,
  Info,
  LogOut,
  Printer
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from './utils/supabaseClient';
import './App.css';

// Type definitions
interface Student {
  id: string;
  first_name: string;
  last_name: string;
  roll_number: string;
  class_name: string;
  section_name: string;
  discount_percentage?: number;
  discount_reason?: string;
  transport_fare?: number;
}

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  subject: string;
  phone: string;
  email: string;
  salary?: number;
}

interface FeeInvoice {
  id: string;
  description: string;
  amount: number;
  status: 'PENDING' | 'PAID';
  student_name: string;
  term: string;
  created_at?: string;
}

interface Transaction {
  id: string;
  title: string;
  date: string;
  amount: number;
  type: 'utility' | 'maintenance' | 'salary' | 'misc';
}

function App() {
  // Auth States
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [isBypassed, setIsBypassed] = useState(false);

  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'teachers' | 'fees' | 'reports' | 'settings'>('dashboard');
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Academic Term 2 (2026)');
  const [globalSearch, setGlobalSearch] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('All');
  const [studentSectionFilter, setStudentSectionFilter] = useState('All');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [newTeacherSalary, setNewTeacherSalary] = useState('35000');
  const [feesViewMode, setFeesViewMode] = useState<'all' | 'pending_by_class'>('all');
  const [pendingFeesClassFilter, setPendingFeesClassFilter] = useState('All');
  const [showSchemaSetup, setShowSchemaSetup] = useState(false);

  // Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [fees, setFees] = useState<FeeInvoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Sync Status for DB Tables
  const [tableStatus, setTableStatus] = useState<Record<string, boolean>>({
    students: false,
    teachers: false,
    fees: false,
    fee_payments: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Modals States
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStudentLedger, setSelectedStudentLedger] = useState<Student | null>(null);
  const [selectedTeacherLedger, setSelectedTeacherLedger] = useState<Teacher | null>(null);
  const [receiptInvoice, setReceiptInvoice] = useState<FeeInvoice | null>(null);

  // Form Fields for Fee Collection
  const [payStudentId, setPayStudentId] = useState('');
  const [payInvoiceId, setPayInvoiceId] = useState('');
  const [payCustomDesc, setPayCustomDesc] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payNotes, setPayNotes] = useState('');

  // Form Fields
  const [newFeeDesc, setNewFeeDesc] = useState('');
  const [newFeeAmount, setNewFeeAmount] = useState('');
  const [newFeeStudent, setNewFeeStudent] = useState('');
  const [newFeeStatus, setNewFeeStatus] = useState<'PENDING' | 'PAID'>('PENDING');

  const [newStudentFirst, setNewStudentFirst] = useState('');
  const [newStudentLast, setNewStudentLast] = useState('');
  const [newStudentRoll, setNewStudentRoll] = useState('');
  const [newStudentClass, setNewStudentClass] = useState('Class 10');
  const [newStudentSection, setNewStudentSection] = useState('A');
  const [newStudentDiscount, setNewStudentDiscount] = useState('0');
  const [newStudentDiscountReason, setNewStudentDiscountReason] = useState('');
  const [newStudentTransport, setNewStudentTransport] = useState('0');
  const [newStudentTransportSlabId, setNewStudentTransportSlabId] = useState('');

  const [transportSlabs, setTransportSlabs] = useState<any[]>(() => {
    const local = localStorage.getItem('transport_slabs');
    if (local) {
      try { return JSON.parse(local); } catch (e) { }
    }
    return [
      { id: '1', min_km: 0, max_km: 2, fare: 500 },
      { id: '2', min_km: 2, max_km: 5, fare: 800 },
      { id: '3', min_km: 5, max_km: 10, fare: 1200 },
      { id: '4', min_km: 10, max_km: 99, fare: 1800 }
    ];
  });
  const [slabMinKm, setSlabMinKm] = useState('');
  const [slabMaxKm, setSlabMaxKm] = useState('');
  const [slabFare, setSlabFare] = useState('');

  const [newFeeTransportSlabId, setNewFeeTransportSlabId] = useState('student_default');
  const [payTransportSlabId, setPayTransportSlabId] = useState('student_default');

  const [newTeacherFirst, setNewTeacherFirst] = useState('');
  const [newTeacherLast, setNewTeacherLast] = useState('');
  const [newTeacherSubject, setNewTeacherSubject] = useState('');
  const [newTeacherPhone, setNewTeacherPhone] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');

  // Check if Supabase variables are supplied
  const isDbConnected = isSupabaseConfigured();

  // 1. Auth Listener
  useEffect(() => {
    if (isDbConnected && supabase) {
      // Get current session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
      });

      // Listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });

      return () => subscription.unsubscribe();
    }
  }, [isDbConnected]);

  // 2. Fetch Data when logged in / bypassed
  useEffect(() => {
    if (session || isBypassed) {
      checkTableStatus();
      loadAllData();
    }
  }, [session, isBypassed, isDbConnected]);

  // Check which tables are created in Supabase
  const checkTableStatus = async () => {
    const client = supabase;
    if (!isDbConnected || !client) return;

    const tables = ['students', 'teachers', 'fees', 'fee_payments'];
    const status: Record<string, boolean> = {};

    for (const table of tables) {
      try {
        const { error } = await client.from(table).select('id').limit(1);
        status[table] = !error;
      } catch {
        status[table] = false;
      }
    }
    setTableStatus(status);
  };

  // Load data from DB, with local storage fallback
  const loadAllData = async () => {
    setIsLoading(true);
    const client = supabase;
    
    // Fallback Initializer helper
    const getLocalData = <T,>(key: string, fallback: T): T => {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : fallback;
    };

    if (isDbConnected && client && session) {
      try {
        // Fetch Students
        const { data: dbStudents, error: sErr } = await client.from('students').select('*');
        if (!sErr && dbStudents) {
          setStudents(dbStudents);
          localStorage.setItem('students', JSON.stringify(dbStudents));
        } else {
          setStudents(getLocalData('students', []));
        }

        // Fetch Teachers
        const { data: dbTeachers, error: tErr } = await client.from('teachers').select('*');
        if (!tErr && dbTeachers) {
          setTeachers(dbTeachers);
          localStorage.setItem('teachers', JSON.stringify(dbTeachers));
        } else {
          setTeachers(getLocalData('teachers', []));
        }

        // Fetch Fees Invoices
        const { data: dbFees, error: fErr } = await client.from('fees').select('*').order('created_at', { ascending: false });
        if (!fErr && dbFees) {
          setFees(dbFees);
          localStorage.setItem('fees', JSON.stringify(dbFees));
        } else {
          setFees(getLocalData('fees', []));
        }

        // Fetch Payments for Transactions
        const { data: dbTx, error: txErr } = await client.from('fee_payments').select('*').order('payment_date', { ascending: false });
        if (!txErr && dbTx) {
          const mappedTx: Transaction[] = dbTx.map((t: any) => ({
            id: t.id.toString(),
            title: t.notes || 'Fee Collected',
            date: new Date(t.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            amount: t.amount,
            type: 'misc'
          }));
          setTransactions(mappedTx);
          localStorage.setItem('transactions', JSON.stringify(mappedTx));
        } else {
          setTransactions(getLocalData('transactions', []));
        }

      } catch (err) {
        console.error("Database fetch exception, using offline mode:", err);
        fallbackToOffline(getLocalData);
      }
    } else {
      // Local Demo Mode
      fallbackToOffline(getLocalData);
    }
    setIsLoading(false);
  };

  const fallbackToOffline = (getLocalData: any) => {
    const initialStudents = getLocalData('students', [
      { id: '1', first_name: 'Aarav', last_name: 'Sharma', roll_number: 'ROLL-001', class_name: 'Class 10', section_name: 'A', discount_percentage: 10, discount_reason: 'Sibling Discount', transport_fare: 1500 },
      { id: '2', first_name: 'Priya', last_name: 'Patel', roll_number: 'ROLL-002', class_name: 'Class 10', section_name: 'A', discount_percentage: 0, discount_reason: '', transport_fare: 0 },
      { id: '3', first_name: 'Rohan', last_name: 'Gupta', roll_number: 'ROLL-003', class_name: 'Class 9', section_name: 'B', discount_percentage: 20, discount_reason: 'Merit Scholarship', transport_fare: 1200 }
    ]);
    const initialTeachers = getLocalData('teachers', [
      { id: '1', first_name: 'Karan', last_name: 'Malhotra', subject: 'Mathematics', phone: '9876543210', email: 'karan@school.com' },
      { id: '2', first_name: 'Anjali', last_name: 'Sen', subject: 'Physics', phone: '9876543211', email: 'anjali@school.com' }
    ]);
    const initialFees = getLocalData('fees', [
      { id: '1', description: 'Tuition Fees (Dec-Jan)', amount: 12500, status: 'PENDING', student_name: 'Aarav Sharma', term: 'Academic Term 2 (2026)' },
      { id: '2', description: 'Science Lab Component', amount: 1200, status: 'PENDING', student_name: 'Aarav Sharma', term: 'Academic Term 2 (2026)' },
      { id: '3', description: 'Sports Tournament Entry', amount: 500, status: 'PAID', student_name: 'Aarav Sharma', term: 'Academic Term 2 (2026)' },
      { id: '4', description: 'Annual Library Fee', amount: 2000, status: 'PAID', student_name: 'Priya Patel', term: 'Academic Term 2 (2026)' }
    ]);
    const initialTransactions = getLocalData('transactions', [
      { id: '1', title: 'Electric Bill - Main Block', date: '22 Oct, 2026', amount: -4200, type: 'utility' },
      { id: '2', title: 'Plumbing Repairs', date: '20 Oct, 2026', amount: -1850, type: 'maintenance' }
    ]);

    setStudents(initialStudents);
    setTeachers(initialTeachers);
    setFees(initialFees);
    setTransactions(initialTransactions);

    localStorage.setItem('students', JSON.stringify(initialStudents));
    localStorage.setItem('teachers', JSON.stringify(initialTeachers));
    localStorage.setItem('fees', JSON.stringify(initialFees));
    localStorage.setItem('transactions', JSON.stringify(initialTransactions));
  };

  // Seed initial test data to Supabase
  const handleSeedDatabase = async () => {
    const client = supabase;
    if (!isDbConnected || !client) return;
    setIsLoading(true);

    try {
      if (tableStatus.students) {
        await client.from('students').insert([
          { first_name: 'Aarav', last_name: 'Sharma', roll_number: 'ROLL-001', class_name: 'Class 10', section_name: 'A', discount_percentage: 10, discount_reason: 'Sibling Discount', transport_fare: 1500 },
          { first_name: 'Priya', last_name: 'Patel', roll_number: 'ROLL-002', class_name: 'Class 10', section_name: 'A', discount_percentage: 0, discount_reason: '', transport_fare: 0 },
          { first_name: 'Rohan', last_name: 'Gupta', roll_number: 'ROLL-003', class_name: 'Class 9', section_name: 'B', discount_percentage: 20, discount_reason: 'Merit Scholarship', transport_fare: 1200 }
        ]);
      }
      if (tableStatus.teachers) {
        await client.from('teachers').insert([
          { first_name: 'Karan', last_name: 'Malhotra', subject: 'Mathematics', phone: '9876543210', email: 'karan@school.com' },
          { first_name: 'Anjali', last_name: 'Sen', subject: 'Physics', phone: '9876543211', email: 'anjali@school.com' }
        ]);
      }
      if (tableStatus.fees) {
        await client.from('fees').insert([
          { description: 'Tuition Fees (Dec-Jan)', amount: 12500, status: 'PENDING', student_name: 'Aarav Sharma', term: 'Academic Term 2 (2026)' },
          { description: 'Science Lab Component', amount: 1200, status: 'PENDING', student_name: 'Aarav Sharma', term: 'Academic Term 2 (2026)' },
          { description: 'Sports Tournament Entry', amount: 500, status: 'PAID', student_name: 'Aarav Sharma', term: 'Academic Term 2 (2026)' }
        ]);
      }

      alert('Database seeded successfully! Reloading...');
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Seeding failed. Ensure SQL Schema is created first.');
    }
    setIsLoading(false);
  };

  // Auth Submit Handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setAuthLoading(true);

    const client = supabase;
    if (isDbConnected && client) {
      try {
        if (authMode === 'login') {
          const { error } = await client.auth.signInWithPassword({ email, password });
          if (error) {
            alert(`Authentication Error:\n\n${error.message}`);
          }
        } else {
          const { error } = await client.auth.signUp({ email, password });
          if (error) {
            alert(`Registration Error:\n\n${error.message}`);
          } else {
            alert('Registration successful! If confirmation is required, check your email inbox. Otherwise, log in now.');
            setAuthMode('login');
          }
        }
      } catch (err: any) {
        alert(`Error: ${err.message || err}`);
      }
    } else {
      setIsBypassed(true);
    }
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    const client = supabase;
    if (isDbConnected && client) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.error(err);
      }
    }
    setSession(null);
    setIsBypassed(false);
    setActiveTab('dashboard');
  };

  // 3. CRUD OPERATIONS

  // --- Add Student ---
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentFirst || !newStudentRoll) return;

    const discountVal = parseFloat(newStudentDiscount) || 0;
    const transportVal = parseFloat(newStudentTransport) || 0;

    const newStudent: Student = {
      id: Date.now().toString(),
      first_name: newStudentFirst,
      last_name: newStudentLast,
      roll_number: newStudentRoll,
      class_name: newStudentClass,
      section_name: newStudentSection,
      discount_percentage: discountVal,
      discount_reason: newStudentDiscountReason,
      transport_fare: transportVal
    };

    const client = supabase;
    if (isDbConnected && client && session && tableStatus.students) {
      try {
        let payload: any = {
          first_name: newStudentFirst,
          last_name: newStudentLast,
          roll_number: newStudentRoll,
          class_name: newStudentClass,
          section_name: newStudentSection,
          discount_percentage: discountVal,
          discount_reason: newStudentDiscountReason,
          transport_fare: transportVal
        };
        let { data, error } = await client.from('students').insert([payload]).select();
        
        if (error && (error.message.includes('discount') || error.message.includes('transport'))) {
          console.warn("Discount/Transport columns not found on students table. Retrying without them.");
          delete payload.discount_percentage;
          delete payload.discount_reason;
          delete payload.transport_fare;
          const retryRes = await client.from('students').insert([payload]).select();
          data = retryRes.data;
          error = retryRes.error;
        }

        if (error) {
          alert(`Failed to add student in Supabase:\n\nError: ${error.message}\nDetails: ${error.details}`);
          console.error("Supabase error adding student:", error);
          return;
        }
        
        if (data && data.length > 0) {
          const saved = {
            ...data[0],
            discount_percentage: discountVal,
            discount_reason: newStudentDiscountReason,
            transport_fare: transportVal
          };
          setStudents(prev => [saved, ...prev]);
        }
      } catch (err: any) {
        console.error(err);
        alert(`Exception: ${err.message || err}`);
        return;
      }
    } else {
      // Local / Offline
      const updated = [newStudent, ...students];
      setStudents(updated);
      localStorage.setItem('students', JSON.stringify(updated));
    }

    // Reset & Close
    setNewStudentFirst('');
    setNewStudentLast('');
    setNewStudentRoll('');
    setNewStudentDiscount('0');
    setNewStudentDiscountReason('');
    setNewStudentTransport('0');
    setNewStudentTransportSlabId('');
    setShowStudentModal(false);
  };

  // --- Delete Student ---
  const handleDeleteStudent = async (id: string) => {
    const client = supabase;
    if (isDbConnected && client && session && tableStatus.students) {
      try {
        const { error } = await client.from('students').delete().eq('id', id);
        if (error) {
          alert(`Failed to delete student:\n\n${error.message}`);
          return;
        }
        setStudents(prev => prev.filter(s => s.id !== id));
      } catch (err: any) {
        console.error(err);
        alert(`Exception: ${err.message || err}`);
      }
    } else {
      const updated = students.filter(s => s.id !== id);
      setStudents(updated);
      localStorage.setItem('students', JSON.stringify(updated));
    }
  };

  // --- Add Teacher ---
  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherFirst || !newTeacherSubject) return;

    const salaryNum = parseFloat(newTeacherSalary) || 35000;
    const newTeacher: Teacher = {
      id: Date.now().toString(),
      first_name: newTeacherFirst,
      last_name: newTeacherLast,
      subject: newTeacherSubject,
      phone: newTeacherPhone,
      email: newTeacherEmail,
      salary: salaryNum
    };

    const client = supabase;
    if (isDbConnected && client && session && tableStatus.teachers) {
      try {
        let payload: any = {
          first_name: newTeacherFirst,
          last_name: newTeacherLast,
          subject: newTeacherSubject,
          phone: newTeacherPhone,
          email: newTeacherEmail,
          salary: salaryNum
        };
        let { data, error } = await client.from('teachers').insert([payload]).select();
        
        if (error && error.message.includes('salary')) {
          console.warn("Salary column not found on teachers table. Retrying without it.");
          delete payload.salary;
          const retryRes = await client.from('teachers').insert([payload]).select();
          data = retryRes.data;
          error = retryRes.error;
        }

        if (error) {
          alert(`Failed to add teacher in Supabase:\n\nError: ${error.message}\nDetails: ${error.details}`);
          console.error("Supabase error adding teacher:", error);
          return;
        }

        if (data && data.length > 0) {
          const saved = { ...data[0], salary: salaryNum };
          setTeachers(prev => [saved, ...prev]);
        }
      } catch (err: any) {
        console.error(err);
        alert(`Exception: ${err.message || err}`);
        return;
      }
    } else {
      // Local
      const updated = [newTeacher, ...teachers];
      setTeachers(updated);
      localStorage.setItem('teachers', JSON.stringify(updated));
    }

    setNewTeacherFirst('');
    setNewTeacherLast('');
    setNewTeacherSubject('');
    setNewTeacherPhone('');
    setNewTeacherEmail('');
    setNewTeacherSalary('35000');
    setShowTeacherModal(false);
  };

  // --- Delete Teacher ---
  const handleDeleteTeacher = async (id: string) => {
    const client = supabase;
    if (isDbConnected && client && session && tableStatus.teachers) {
      try {
        const { error } = await client.from('teachers').delete().eq('id', id);
        if (error) {
          alert(`Failed to delete teacher:\n\n${error.message}`);
          return;
        }
        setTeachers(prev => prev.filter(t => t.id !== id));
      } catch (err: any) {
        console.error(err);
        alert(`Exception: ${err.message || err}`);
      }
    } else {
      const updated = teachers.filter(t => t.id !== id);
      setTeachers(updated);
      localStorage.setItem('teachers', JSON.stringify(updated));
    }
  };

  // --- Create Fee Invoice ---
  const handleAddFeeInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeeDesc || !newFeeAmount || !newFeeStudent) return;

    const baseAmount = parseFloat(newFeeAmount);
    if (isNaN(baseAmount)) return;

    // Apply Discount & Transport Fare dynamically
    const selectedStudentData = students.find(s => `${s.first_name} ${s.last_name || ''}`.trim() === newFeeStudent);
    let amountNum = baseAmount;
    if (selectedStudentData) {
      const discount = selectedStudentData.discount_percentage || 0;
      let transport = selectedStudentData.transport_fare || 0;
      if (newFeeTransportSlabId === 'none') {
        transport = 0;
      } else if (newFeeTransportSlabId !== 'student_default') {
        const selectedSlab = transportSlabs.find(slab => slab.id === newFeeTransportSlabId);
        if (selectedSlab) transport = selectedSlab.fare;
      }
      amountNum = (baseAmount * (1 - discount / 100)) + transport;
    }

    const client = supabase;
    let savedInvoice: FeeInvoice = {
      id: Date.now().toString(),
      description: newFeeDesc,
      amount: amountNum,
      status: newFeeStatus,
      student_name: newFeeStudent,
      term: selectedTerm
    };

    if (isDbConnected && client && session && tableStatus.fees) {
      try {
        const { data, error } = await client.from('fees').insert([{ 
          description: newFeeDesc, 
          amount: amountNum, 
          status: newFeeStatus,
          student_name: newFeeStudent,
          term: selectedTerm
        }]).select();
        
        if (error) {
          alert(`Failed to create invoice in Supabase:\n\nError: ${error.message}\nDetails: ${error.details}`);
          console.error("Supabase error creating fee:", error);
          return;
        }

        if (data && data.length > 0) {
          savedInvoice = data[0];
          
          if (newFeeStatus === 'PAID' && tableStatus.fee_payments) {
            const { error: pErr } = await client.from('fee_payments').insert([{
              fee_id: savedInvoice.id,
              amount: amountNum,
              notes: `Fee payment received from ${newFeeStudent}`
            }]);
            if (pErr) {
              console.error("Failed to log payment transaction:", pErr);
            }
          }
        }
      } catch (err: any) {
        console.error(err);
        alert(`Exception: ${err.message || err}`);
        return;
      }
    }

    const updatedFees = [savedInvoice, ...fees];
    setFees(updatedFees);
    localStorage.setItem('fees', JSON.stringify(updatedFees));

    if (newFeeStatus === 'PAID') {
      const newTx: Transaction = {
        id: Date.now().toString(),
        title: `Fee collected from ${newFeeStudent}`,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        amount: amountNum,
        type: 'misc'
      };
      const updatedTx = [newTx, ...transactions];
      setTransactions(updatedTx);
      localStorage.setItem('transactions', JSON.stringify(updatedTx));
    }

    setNewFeeDesc('');
    setNewFeeAmount('');
    setNewFeeStudent('');
    setNewFeeTransportSlabId('student_default');
    setShowInvoiceModal(false);
  };

  // --- Mark Invoice as Paid ---
  const handleMarkAsPaid = async (id: string) => {
    const selected = fees.find(f => String(f.id) === String(id));
    if (!selected) return;

    const amountNum = selected.amount;
    const client = supabase;
    if (isDbConnected && client && session && tableStatus.fees) {
      try {
        const { error } = await client.from('fees').update({ status: 'PAID' }).eq('id', id);
        if (error) {
          alert(`Failed to update status in Supabase:\n\n${error.message}`);
          return;
        }

        if (tableStatus.fee_payments) {
          const { error: pErr } = await client.from('fee_payments').insert([{
            fee_id: id,
            amount: amountNum,
            notes: `Invoice status manually marked PAID for ${selected.student_name}`
          }]);
          if (pErr) console.error("Payment insert error:", pErr);
        }
      } catch (err: any) {
        alert(`Error: ${err.message}`);
        return;
      }
    }
    setFees(prev => prev.map(f => String(f.id) === String(id) ? { ...f, status: 'PAID' } : f));
  };

  // --- Collect Fee Payment (Direct/Custom) ---
  const handleCollectFeePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payStudentId || !payAmount) return;

    const amountNum = parseFloat(payAmount);
    if (isNaN(amountNum)) return;

    const studentObj = students.find(s => String(s.id) === String(payStudentId));
    if (!studentObj) return;

    const studentFullName = `${studentObj.first_name} ${studentObj.last_name || ''}`.trim();
    let savedInvoice: FeeInvoice = {
      id: Date.now().toString(),
      description: payCustomDesc || 'Direct Fee Payment',
      amount: amountNum,
      status: 'PAID',
      student_name: studentFullName,
      term: selectedTerm
    };

    const client = supabase;
    if (payInvoiceId && payInvoiceId !== 'custom') {
      // Paying an existing pending invoice
      if (isDbConnected && client && session && tableStatus.fees) {
        try {
          const { error } = await client.from('fees').update({ status: 'PAID' }).eq('id', payInvoiceId);
          if (error) {
            alert(`Failed to update status in Supabase:\n\n${error.message}`);
            return;
          }

          if (tableStatus.fee_payments) {
            const { error: pErr } = await client.from('fee_payments').insert([{
              fee_id: payInvoiceId,
              amount: amountNum,
              notes: `Paid via ${payMethod}. Ref: ${payNotes || 'None'}`
            }]);
            if (pErr) console.error("Payment insert error:", pErr);
          }
        } catch (err: any) {
          alert(`Error: ${err.message}`);
          return;
        }
      }
      setFees(prev => prev.map(f => String(f.id) === String(payInvoiceId) ? { ...f, status: 'PAID' } : f));
    } else {
      // Direct custom payment
      const desc = payCustomDesc || 'Direct Fee Payment';
      if (isDbConnected && client && session && tableStatus.fees) {
        try {
          const { data, error } = await client.from('fees').insert([{
            description: desc,
            amount: amountNum,
            status: 'PAID',
            student_name: studentFullName,
            term: selectedTerm
          }]).select();

          if (error) {
            alert(`Failed to create direct payment:\n\n${error.message}`);
            return;
          }

          if (data && data.length > 0) {
            savedInvoice = data[0];
            if (tableStatus.fee_payments) {
              await client.from('fee_payments').insert([{
                fee_id: savedInvoice.id,
                amount: amountNum,
                notes: `Direct payment via ${payMethod}. Ref: ${payNotes || 'None'}`
              }]);
            }
          }
        } catch (err: any) {
          alert(`Error: ${err.message}`);
          return;
        }
      }
      setFees(prev => [savedInvoice, ...prev]);
    }

    // Log to transaction list
    const newTx: Transaction = {
      id: Date.now().toString(),
      title: `Fee collected from ${studentFullName} (${payMethod})`,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      amount: amountNum,
      type: 'misc'
    };
    setTransactions(prev => [newTx, ...prev]);

    // Reset fields & close modal
    setPayStudentId('');
    setPayInvoiceId('');
    setPayCustomDesc('');
    setPayAmount('');
    setPayMethod('Cash');
    setPayNotes('');
    setShowPaymentModal(false);
    
    // Refresh to reload data
    loadAllData();
  };

  // 4. STATS COMPUTATION
  const totalStudentsCount = students.length;
  
  const totalFeesCollected = fees
    .filter(f => f.status === 'PAID')
    .reduce((sum, f) => sum + f.amount, 0);

  const defaultersCount = fees.filter(f => f.status === 'PENDING').length;

  // Filter lists
  const filteredFees = fees.filter(fee => {
    const matchesSearch = 
      fee.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fee.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTerm = fee.term === selectedTerm;
    return matchesSearch && matchesTerm;
  });

  const filteredStudents = students.filter(s => {
    const fullName = `${s.first_name} ${s.last_name || ''}`.toLowerCase();
    const roll = s.roll_number.toLowerCase();
    const query = studentSearchQuery.toLowerCase();
    
    const matchesSearch = fullName.includes(query) || roll.includes(query);
    const matchesClass = studentClassFilter === 'All' || s.class_name === studentClassFilter;
    const matchesSection = studentSectionFilter === 'All' || s.section_name === studentSectionFilter;
    
    return matchesSearch && matchesClass && matchesSection;
  });

  const filteredTeachers = teachers.filter(t => {
    const fullName = `${t.first_name} ${t.last_name || ''}`.toLowerCase();
    const sub = t.subject.toLowerCase();
    const query = teacherSearchQuery.toLowerCase();
    
    return fullName.includes(query) || sub.includes(query);
  });

  const sqlSchema = `-- Run this in your Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    roll_number VARCHAR(50) NOT NULL UNIQUE,
    class_name VARCHAR(50) DEFAULT 'Class 10',
    section_name VARCHAR(10) DEFAULT 'A',
    discount_percentage INTEGER DEFAULT 0,
    discount_reason VARCHAR(255),
    transport_fare NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS teachers (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    subject VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    salary INTEGER DEFAULT 35000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS fees (
    id SERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID')),
    student_name VARCHAR(255) NOT NULL,
    term VARCHAR(100) DEFAULT 'Academic Term 2 (2026)',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS fee_payments (
    id SERIAL PRIMARY KEY,
    fee_id INTEGER,
    amount NUMERIC(10, 2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    notes VARCHAR(255)
);`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  // --- AUTH RENDER IF NOT LOGGED IN ---
  if (!session && !isBypassed) {
    return (
      <div className="login-page">
        {/* Left Side: Brand Banner */}
        <div className="login-banner">
          <div className="login-banner-logo">
            <div className="login-banner-logo-icon">G</div>
            <span className="login-banner-title">Global International School</span>
          </div>

          <div className="login-banner-center">
            <h1>Admin & Billing Management Portal</h1>
            <p>
              Access student files, track academic fee collections, record operating expenses, 
              and synchronize databases in real-time.
            </p>
          </div>

          <div className="login-banner-footer">
            &copy; 2026 Global International School Admin Team. All rights reserved.
          </div>
        </div>

        {/* Right Side: Credentials Panel */}
        <div className="login-content">
          <div className="login-box">
            <div className="login-header">
              <h2>{authMode === 'login' ? 'Welcome Back' : 'Create Admin Account'}</h2>
              <p>
                {authMode === 'login' 
                  ? 'Enter your school credentials to access the admin portal.' 
                  : 'Register a new administrator account.'}
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="login-form">
              <div className="filter-group">
                <label className="filter-label">Email Address</label>
                <input 
                  type="email" 
                  className="input-text" 
                  placeholder="admin@school.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">Password</label>
                <input 
                  type="password" 
                  className="input-text" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-login" disabled={authLoading}>
                {authLoading ? 'Verifying...' : authMode === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            </form>

            <div className="login-footer-link">
              {authMode === 'login' ? (
                <>
                  Don't have an admin account?{' '}
                  <a onClick={() => setAuthMode('signup')}>Register here</a>
                </>
              ) : (
                <>
                  Already registered?{' '}
                  <a onClick={() => setAuthMode('login')}>Log in here</a>
                </>
              )}
            </div>

            {/* Offline bypass mode button */}
            <button 
              type="button" 
              className="btn-bypass-auth"
              onClick={() => setIsBypassed(true)}
            >
              Use Offline Demo Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- LOGGED IN MAIN RENDER ---
  const displayName = session ? session.user.email.split('@')[0] : 'Demo Admin';
  const displayEmail = session ? session.user.email : 'demo@school.com';
  const displayInitials = session ? session.user.email.substring(0, 2).toUpperCase() : 'DA';

  return (
    <div className="app-container">
      
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">G</div>
          <div className="brand-details">
            <span className="brand-name">Global International</span>
            <span className="brand-sub">School Admin</span>
          </div>
        </div>

        <nav className="sidebar-menu">
          <a 
            className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </a>
          <a 
            className={`menu-item ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            <GraduationCap size={18} />
            Students
          </a>
          <a 
            className={`menu-item ${activeTab === 'teachers' ? 'active' : ''}`}
            onClick={() => setActiveTab('teachers')}
          >
            <Users size={18} />
            Teachers
          </a>
          <a 
            className={`menu-item ${activeTab === 'fees' ? 'active' : ''}`}
            onClick={() => setActiveTab('fees')}
          >
            <CreditCard size={18} />
            Fees Management
          </a>
          <a 
            className={`menu-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <BarChart3 size={18} />
            Reports
          </a>
          <a 
            className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <SettingsIcon size={18} />
            Settings
          </a>
        </nav>

        <div className="sidebar-footer" style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
          <button 
            onClick={handleSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              color: 'rgba(255,255,255,0.7)',
              background: 'none',
              border: 'none',
              width: '100%',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.2s',
              textAlign: 'left'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.color = '#FCA5A5'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
          >
            <LogOut size={18} />
            Sign Out
          </button>

          <div className="term-card">
            <div className="term-title">Academic Year 2026-27</div>
            <div className="term-status">Term 1 in progress</div>
          </div>
        </div>
      </aside>

      {/* MAIN WRAPPER */}
      <main className="main-wrapper">
        
        {/* HEADER */}
        <header className="header">
          <div className="header-search">
            <Search size={16} className="text-light" />
            <input 
              type="text" 
              placeholder={`Search ${activeTab === 'students' ? 'students...' : activeTab === 'teachers' ? 'teachers...' : 'anything...'}`}
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
          </div>

          <div className="header-actions">
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: isDbConnected && session ? '#ECFDF5' : '#FFF7ED',
                color: isDbConnected && session ? '#047857' : '#C2410C',
                fontWeight: 600
              }}
              title={isDbConnected && session ? "Supabase Connected" : "Local Mock Mode"}
            >
              <Database size={12} />
              <span>{isDbConnected && session ? "Supabase Active" : "Local Demo"}</span>
            </div>

            <button className="notification-btn">
              <Bell size={20} />
              <span className="notification-badge">3</span>
            </button>

            <div className="user-profile">
              <div className="user-info">
                <span className="user-name" style={{textTransform: 'capitalize'}}>{displayName}</span>
                <span className="user-role" title={displayEmail}>{session ? "School Admin" : "Demo Administrator"}</span>
              </div>
              <div className="user-avatar" style={{backgroundColor: 'var(--sidebar-active-bg)', color: '#fff'}}>{displayInitials}</div>
            </div>
          </div>
        </header>

        {/* LOADING INDICATOR */}
        {isLoading && (
          <div style={{height: '2px', backgroundColor: 'var(--blue-accent-bg)', overflow: 'hidden'}}>
            <div style={{height: '100%', width: '30%', backgroundColor: 'var(--blue-accent)', animation: 'shimmer 1.5s infinite linear'}}></div>
          </div>
        )}

        {/* DB ALERT BAR (If live mode but tables aren't created) */}
        {isDbConnected && Object.values(tableStatus).includes(false) && activeTab !== 'settings' && (
          <div style={{padding: '12px 32px 0 32px'}}>
            <div className="db-alert">
              <Info size={16} />
              <span>
                <strong>Warning:</strong> Some database tables are missing in your Supabase project. Head to Settings to view the SQL Setup Code.
              </span>
              <button className="db-alert-btn" onClick={() => setActiveTab('settings')}>
                Fix Schema
              </button>
            </div>
          </div>
        )}

        {/* --- 1. DASHBOARD PAGE --- */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-content">
            
            {/* KPI Cards */}
            <div className="kpi-grid">
              <div className="kpi-card blue">
                <div className="kpi-data">
                  <span className="kpi-label">Total Students</span>
                  <span className="kpi-value">{totalStudentsCount.toLocaleString()}</span>
                </div>
                <div className="kpi-icon">
                  <Users size={22} />
                </div>
              </div>

              <div className="kpi-card green">
                <div className="kpi-data">
                  <span className="kpi-label">Fees Collected (M-T-D)</span>
                  <span className="kpi-value">₹{totalFeesCollected.toLocaleString('en-IN')}</span>
                </div>
                <div className="kpi-icon">
                  <DollarSign size={22} />
                </div>
              </div>

              <div className="kpi-card red">
                <div className="kpi-data">
                  <span className="kpi-label">Total Defaulters</span>
                  <span className="kpi-value">{defaultersCount} <span style={{fontSize: '14px', fontWeight: 500, color: 'var(--text-light)'}}>Students</span></span>
                </div>
                <div className="kpi-icon">
                  <AlertTriangle size={22} />
                </div>
              </div>
            </div>

            {/* Split Grid */}
            <div className="dashboard-grid">
              
              {/* Left Panel: Fees Collection Portal */}
              <div className="panel">
                <div className="panel-header">
                  <h3 className="panel-title">Fees Collection Portal</h3>
                  <button className="btn-quick-action" onClick={() => setShowInvoiceModal(true)}>
                    Quick Action
                  </button>
                </div>

                <div className="filters-row">
                  <div className="filter-group">
                    <label className="filter-label">Search Student</label>
                    <input 
                      type="text" 
                      className="input-text" 
                      placeholder="Search Name (e.g. Aarav Sharma)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="filter-group">
                    <label className="filter-label">Select Fee Term</label>
                    <select 
                      className="select-input"
                      value={selectedTerm}
                      onChange={(e) => setSelectedTerm(e.target.value)}
                    >
                      <option value="Academic Term 2 (2026)">Academic Term 2 (2026)</option>
                      <option value="Academic Term 1 (2026)">Academic Term 1 (2026)</option>
                    </select>
                  </div>
                </div>

                <div className="fees-table-container">
                  <table className="fees-table">
                    <thead>
                      <tr>
                        <th>Fee Description</th>
                        <th>Due Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFees.length > 0 ? (
                        filteredFees.slice(0, 4).map(fee => (
                          <tr key={fee.id}>
                            <td>
                              <div style={{fontWeight: 500}}>{fee.description}</div>
                              <div style={{fontSize: '11px', color: 'var(--text-light)', marginTop: '2px'}}>{fee.student_name}</div>
                            </td>
                            <td className="due-amount">₹{fee.amount.toLocaleString('en-IN')}</td>
                            <td>
                              <span className={`badge ${fee.status.toLowerCase()}`}>
                                {fee.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} style={{textAlign: 'center', padding: '24px', color: 'var(--text-light)'}}>
                            No fee records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Panel: Expenses & Transactions */}
              <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                
                <div className="panel">
                  <h3 className="panel-title" style={{marginBottom: '16px'}}>School Expenses</h3>
                  
                  <div className="expenses-chart-container">
                    <div className="chart-wrapper">
                      <svg width="100%" height="100%" viewBox="0 0 40 40">
                        <circle cx="20" cy="20" r="15.915" fill="transparent" stroke="#E2E8F0" strokeWidth="4"></circle>
                        <circle cx="20" cy="20" r="15.915" fill="transparent" stroke="var(--blue-accent)" strokeWidth="4" strokeDasharray="45 55" strokeDashoffset="0"></circle>
                        <circle cx="20" cy="20" r="15.915" fill="transparent" stroke="var(--green-accent)" strokeWidth="4" strokeDasharray="25 75" strokeDashoffset="-45"></circle>
                        <circle cx="20" cy="20" r="15.915" fill="transparent" stroke="#F59E0B" strokeWidth="4" strokeDasharray="15 85" strokeDashoffset="-70"></circle>
                        <circle cx="20" cy="20" r="15.915" fill="transparent" stroke="#CBD5E1" strokeWidth="4" strokeDasharray="15 85" strokeDashoffset="-85"></circle>
                      </svg>
                      <div className="chart-center-label">
                        <span style={{fontSize: '11px', color: 'var(--text-light)', fontWeight: 500}}>Total Exp</span>
                        <span style={{fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px'}}>₹6.2L</span>
                      </div>
                    </div>

                    <div className="chart-legend">
                      <div className="legend-item"><span className="legend-dot maintenance"></span><span>Maintenance</span></div>
                      <div className="legend-item"><span className="legend-dot misc"></span><span>Misc Events</span></div>
                      <div className="legend-item"><span className="legend-dot salary"></span><span>Staff Salary</span></div>
                      <div className="legend-item"><span className="legend-dot utilities"></span><span>Utilities</span></div>
                    </div>
                  </div>

                  <div>
                    <span style={{fontSize: '10px', fontWeight: 700, color: 'var(--text-light)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '14px'}}>
                      Recent Transactions
                    </span>
                    <div className="transactions-list">
                      {transactions.slice(0, 2).map(tx => (
                        <div className="transaction-item" key={tx.id}>
                          <div className="transaction-details">
                            <div className={`transaction-icon ${tx.amount < 0 ? 'electric' : 'plumbing'}`}>
                              {tx.amount < 0 ? <Zap size={14} /> : <Wrench size={14} />}
                            </div>
                            <div className="transaction-info">
                              <span className="transaction-title">{tx.title}</span>
                              <span className="transaction-date">{tx.date}</span>
                            </div>
                          </div>
                          <span className="transaction-amount" style={{color: tx.amount < 0 ? 'var(--text-primary)' : 'var(--green-accent)'}}>
                            {tx.amount < 0 ? `-₹${Math.abs(tx.amount).toLocaleString('en-IN')}` : `+₹${tx.amount.toLocaleString('en-IN')}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* --- 2. STUDENTS PAGE --- */}
        {activeTab === 'students' && (
          <div className="dashboard-content">
            <div className="tab-actions">
              <div>
                <h2 style={{margin: 0, fontSize: '20px'}}>Student Directory</h2>
                <p style={{fontSize: '12px', color: 'var(--text-light)', marginTop: '4px'}}>Manage student profile entries, filter class-wise, and record collections.</p>
              </div>
              <button className="btn-quick-action" onClick={() => setShowStudentModal(true)} style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                <Plus size={14} /> Add Student
              </button>
            </div>

            <div className="panel" style={{padding: '0'}}>
              <div style={{padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center'}}>
                <div style={{flexGrow: 1, minWidth: '240px', position: 'relative'}}>
                  <Search size={16} style={{position: 'absolute', left: '12px', top: '12px', color: 'var(--text-light)'}} />
                  <input 
                    type="text" 
                    className="input-text" 
                    style={{paddingLeft: '36px'}} 
                    placeholder="Search by student name or roll number..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                  />
                </div>
                
                <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span style={{fontSize: '12px', fontWeight: 600, color: 'var(--text-light)'}}>Class:</span>
                    <select 
                      className="select-input" 
                      style={{width: '160px'}}
                      value={studentClassFilter}
                      onChange={(e) => setStudentClassFilter(e.target.value)}
                    >
                      <option value="All">All Classes</option>
                      <option value="Class 1">Class 1</option>
                      <option value="Class 2">Class 2</option>
                      <option value="Class 3">Class 3</option>
                      <option value="Class 4">Class 4</option>
                      <option value="Class 5">Class 5</option>
                      <option value="Class 6">Class 6</option>
                      <option value="Class 7">Class 7</option>
                      <option value="Class 8">Class 8</option>
                      <option value="Class 9">Class 9</option>
                      <option value="Class 10">Class 10</option>
                      <option value="Class 11">Class 11</option>
                      <option value="Class 12">Class 12</option>
                    </select>
                  </div>

                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span style={{fontSize: '12px', fontWeight: 600, color: 'var(--text-light)'}}>Section:</span>
                    <select 
                      className="select-input" 
                      style={{width: '120px'}}
                      value={studentSectionFilter}
                      onChange={(e) => setStudentSectionFilter(e.target.value)}
                    >
                      <option value="All">All Sections</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                </div>
              </div>

              <table className="fees-table" style={{width: '100%'}}>
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Student Name</th>
                    <th>Class</th>
                    <th>Section</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map(student => (
                      <tr key={student.id}>
                        <td style={{fontWeight: 600, color: 'var(--text-primary)'}}>{student.roll_number}</td>
                        <td>
                          <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '50%', 
                              backgroundColor: 'var(--primary-accent-bg)', color: 'var(--primary-accent)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 600, fontSize: '13px'
                            }}>
                              {student.first_name[0]}{student.last_name ? student.last_name[0] : ''}
                            </div>
                            <div>
                              <span 
                                style={{fontWeight: 600, cursor: 'pointer', color: 'var(--primary-accent)'}}
                                onClick={() => setSelectedStudentLedger(student)}
                                className="hover-underline"
                              >
                                {student.first_name} {student.last_name || ''}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>{student.class_name}</td>
                        <td>{student.section_name}</td>
                        <td>
                          <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                            <button 
                              className="btn-quick-action" 
                              style={{
                                padding: '6px 12px', fontSize: '12px', display: 'flex', 
                                alignItems: 'center', gap: '4px', backgroundColor: 'var(--green-accent-bg)', 
                                color: 'var(--green-accent)', border: 'none', cursor: 'pointer'
                              }}
                              onClick={() => {
                                setPayStudentId(student.id);
                                setPayInvoiceId('');
                                setPayCustomDesc('');
                                setPayAmount('');
                                setShowPaymentModal(true);
                              }}
                            >
                              <DollarSign size={12} /> Collect Fee
                            </button>
                            <button 
                              className="card-delete-btn" 
                              style={{position: 'static', padding: '6px'}}
                              onClick={() => handleDeleteStudent(student.id)} 
                              title="Delete Student"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{textAlign: 'center', padding: '48px', color: 'var(--text-light)'}}>
                        No students found matching the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- 3. TEACHERS PAGE --- */}
        {activeTab === 'teachers' && (
          <div className="dashboard-content">
            <div className="tab-actions">
              <div>
                <h2 style={{margin: 0, fontSize: '20px'}}>Teacher Directory</h2>
                <p style={{fontSize: '12px', color: 'var(--text-light)', marginTop: '4px'}}>Manage staff members, subjects assignments, salaries, and disbursement logs.</p>
              </div>
              <button className="btn-quick-action" onClick={() => setShowTeacherModal(true)} style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                <Plus size={14} /> Add Teacher
              </button>
            </div>

            <div className="panel" style={{padding: '0'}}>
              <div style={{padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '20px', alignItems: 'center'}}>
                <div style={{flexGrow: 1, position: 'relative'}}>
                  <Search size={16} style={{position: 'absolute', left: '12px', top: '12px', color: 'var(--text-light)'}} />
                  <input 
                    type="text" 
                    className="input-text" 
                    style={{paddingLeft: '36px'}} 
                    placeholder="Search by teacher name or subject..."
                    value={teacherSearchQuery}
                    onChange={(e) => setTeacherSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <table className="fees-table" style={{width: '100%'}}>
                <thead>
                  <tr>
                    <th>Teacher Name</th>
                    <th>Subject</th>
                    <th>Phone</th>
                    <th>Email Address</th>
                    <th>Salary</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.length > 0 ? (
                    filteredTeachers.map(teacher => {
                      const salaryVal = teacher.salary !== undefined ? teacher.salary : 35000;
                      return (
                        <tr key={teacher.id}>
                          <td>
                            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                              <div style={{
                                width: '32px', height: '32px', borderRadius: '50%', 
                                backgroundColor: 'var(--green-accent-bg)', color: 'var(--green-accent)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 600, fontSize: '13px'
                              }}>
                                {teacher.first_name[0]}{teacher.last_name ? teacher.last_name[0] : ''}
                              </div>
                              <span 
                                style={{fontWeight: 600, cursor: 'pointer', color: 'var(--primary-accent)'}}
                                onClick={() => setSelectedTeacherLedger(teacher)}
                                className="hover-underline"
                              >
                                {teacher.first_name} {teacher.last_name || ''}
                              </span>
                            </div>
                          </td>
                          <td style={{fontWeight: 600, color: 'var(--green-accent)'}}>{teacher.subject}</td>
                          <td>{teacher.phone || 'N/A'}</td>
                          <td>{teacher.email || 'N/A'}</td>
                          <td style={{fontWeight: 700}}>₹{salaryVal.toLocaleString('en-IN')}</td>
                          <td>
                            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                              <button 
                                className="btn-quick-action" 
                                style={{
                                  padding: '6px 12px', fontSize: '12px', display: 'flex', 
                                  alignItems: 'center', gap: '4px', backgroundColor: 'var(--green-accent-bg)', 
                                  color: 'var(--green-accent)', border: 'none', cursor: 'pointer'
                                }}
                                onClick={async () => {
                                  const tName = `${teacher.first_name} ${teacher.last_name || ''}`.trim();
                                  const desc = `Salary payment to ${tName}`;
                                  
                                  const newTx: Transaction = {
                                    id: Date.now().toString(),
                                    title: desc,
                                    date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                                    amount: -salaryVal,
                                    type: 'salary'
                                  };
                                  
                                  setTransactions(prev => [newTx, ...prev]);
                                  alert(`Salary payment of ₹${salaryVal.toLocaleString('en-IN')} logged successfully for ${tName}!`);
                                }}
                              >
                                <DollarSign size={12} /> Pay Salary
                              </button>
                              <button 
                                className="card-delete-btn" 
                                style={{position: 'static', padding: '6px'}}
                                onClick={() => handleDeleteTeacher(teacher.id)} 
                                title="Delete Staff"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} style={{textAlign: 'center', padding: '48px', color: 'var(--text-light)'}}>
                        No staff members found matching the search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- 4. FEES MANAGEMENT PAGE --- */}
        {activeTab === 'fees' && (
          <div className="dashboard-content">
            <div className="tab-actions">
              <div>
                <h2 style={{margin: 0, fontSize: '20px'}}>Fees Invoices Registry</h2>
                <p style={{fontSize: '12px', color: 'var(--text-light)', marginTop: '4px'}}>Track billings, unpaid invoices and register collection records.</p>
              </div>
              <div style={{display: 'flex', gap: '12px'}}>
                <button className="btn-quick-action" onClick={() => setShowInvoiceModal(true)} style={{display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#F8FAFC', color: 'var(--text-primary)', border: '1px solid var(--border-color)'}}>
                  <Plus size={14} /> Create Invoice
                </button>
                <button className="btn-quick-action" onClick={() => setShowPaymentModal(true)} style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                  <DollarSign size={14} /> Collect Fee Payment
                </button>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div style={{display: 'flex', gap: '10px', marginBottom: '16px'}}>
              <button 
                onClick={() => setFeesViewMode('all')}
                style={{
                  padding: '8px 16px', fontSize: '13px', borderRadius: '20px', 
                  border: '1px solid ' + (feesViewMode === 'all' ? 'var(--blue-accent)' : 'var(--border-color)'),
                  backgroundColor: feesViewMode === 'all' ? 'var(--blue-accent)' : 'transparent',
                  color: feesViewMode === 'all' ? '#FFFFFF' : '#475569',
                  fontWeight: 600, cursor: 'pointer'
                }}
              >
                All Invoices
              </button>
              <button 
                onClick={() => setFeesViewMode('pending_by_class')}
                style={{
                  padding: '8px 16px', fontSize: '13px', borderRadius: '20px', 
                  border: '1px solid ' + (feesViewMode === 'pending_by_class' ? 'var(--blue-accent)' : 'var(--border-color)'),
                  backgroundColor: feesViewMode === 'pending_by_class' ? 'var(--blue-accent)' : 'transparent',
                  color: feesViewMode === 'pending_by_class' ? '#FFFFFF' : '#475569',
                  fontWeight: 600, cursor: 'pointer'
                }}
              >
                Pending Fees by Class
              </button>
            </div>

            <div className="panel" style={{padding: '0'}}>
              {feesViewMode === 'all' ? (
                <>
                  <div style={{padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '16px'}}>
                    <div style={{flexGrow: 1, position: 'relative'}}>
                      <Search size={16} style={{position: 'absolute', left: '12px', top: '12px', color: 'var(--text-light)'}} />
                      <input 
                        type="text" 
                        className="input-text" 
                        style={{paddingLeft: '36px'}} 
                        placeholder="Search invoices by student name or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <select 
                      className="select-input" 
                      style={{width: '240px'}}
                      value={selectedTerm}
                      onChange={(e) => setSelectedTerm(e.target.value)}
                    >
                      <option value="Academic Term 2 (2026)">Academic Term 2 (2026)</option>
                      <option value="Academic Term 1 (2026)">Academic Term 1 (2026)</option>
                    </select>
                  </div>

                  <table className="fees-table" style={{width: '100%'}}>
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Fee Description</th>
                        <th>Term</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFees.length > 0 ? (
                        filteredFees.map(fee => (
                          <tr key={fee.id}>
                            <td style={{fontWeight: 600}}>{fee.student_name}</td>
                            <td>{fee.description}</td>
                            <td style={{color: 'var(--text-light)'}}>{fee.term}</td>
                            <td className="due-amount">₹{fee.amount.toLocaleString('en-IN')}</td>
                            <td>
                              <span className={`badge ${fee.status.toLowerCase()}`}>
                                {fee.status}
                              </span>
                            </td>
                            <td>
                              <div style={{display: 'flex', gap: '6px', alignItems: 'center'}}>
                                {fee.status === 'PENDING' ? (
                                  <button 
                                    className="btn-quick-action" 
                                    onClick={() => handleMarkAsPaid(fee.id)}
                                    style={{padding: '4px 8px', fontSize: '10px'}}
                                  >
                                    Collect Fee
                                  </button>
                                ) : (
                                  <span style={{color: 'var(--green-accent)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                    <CheckCircle size={14} /> Paid
                                  </span>
                                )}
                                <button
                                  className="btn-quick-action"
                                  onClick={() => setReceiptInvoice(fee)}
                                  style={{
                                    padding: '4px 8px', fontSize: '10px',
                                    backgroundColor: 'var(--blue-accent-bg)',
                                    color: 'var(--blue-accent)', border: 'none',
                                    display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer'
                                  }}
                                  title="View Receipt"
                                >
                                  <Printer size={11} /> Receipt
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} style={{textAlign: 'center', padding: '48px', color: 'var(--text-light)'}}>
                            No invoice matches your filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </>
              ) : (
                <>
                  <div style={{padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '20px', alignItems: 'center'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <span style={{fontSize: '13px', fontWeight: 600, color: 'var(--text-light)'}}>Select Class:</span>
                      <select 
                        className="select-input" 
                        style={{width: '200px', padding: '6px 12px'}}
                        value={pendingFeesClassFilter}
                        onChange={(e) => setPendingFeesClassFilter(e.target.value)}
                      >
                        <option value="All">All Classes</option>
                        {['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <table className="fees-table" style={{width: '100%'}}>
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Class</th>
                        <th>Section</th>
                        <th>Pending Invoices</th>
                        <th>Total Pending Amount</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const studentsWithPending = students
                          .filter(s => pendingFeesClassFilter === 'All' || s.class_name === pendingFeesClassFilter)
                          .map(s => {
                            const studentFullName = `${s.first_name} ${s.last_name || ''}`.trim();
                            const studentPendingInvoices = fees.filter(f => f.student_name.toLowerCase() === studentFullName.toLowerCase() && f.status === 'PENDING');
                            const totalPendingAmount = studentPendingInvoices.reduce((sum, f) => sum + f.amount, 0);
                            return {
                              student: s,
                              fullName: studentFullName,
                              pendingInvoices: studentPendingInvoices,
                              totalPendingAmount
                            };
                          })
                          .filter(item => item.totalPendingAmount > 0);

                        if (studentsWithPending.length > 0) {
                          return studentsWithPending.map(item => (
                            <tr key={item.student.id}>
                              <td>
                                <span 
                                  style={{fontWeight: 600, cursor: 'pointer', color: 'var(--blue-accent)'}}
                                  onClick={() => setSelectedStudentLedger(item.student)}
                                  className="hover-underline"
                                >
                                  {item.fullName}
                                </span>
                              </td>
                              <td>{item.student.class_name}</td>
                              <td>{item.student.section_name}</td>
                              <td>
                                <span style={{fontWeight: 500, color: 'var(--text-light)'}}>
                                  {item.pendingInvoices.length} Invoices
                                </span>
                              </td>
                              <td style={{fontWeight: 700, color: '#B91C1C'}}>
                                ₹{item.totalPendingAmount.toLocaleString('en-IN')}
                              </td>
                              <td>
                                <button 
                                  className="btn-quick-action" 
                                  style={{
                                    padding: '6px 12px', fontSize: '12px', display: 'flex', 
                                    alignItems: 'center', gap: '4px', backgroundColor: 'var(--green-accent-bg)', 
                                    color: 'var(--green-accent)', border: 'none', cursor: 'pointer'
                                  }}
                                  onClick={() => {
                                    const firstInvoice = item.pendingInvoices[0];
                                    setPayStudentId(item.student.id);
                                    if (firstInvoice) {
                                      setPayInvoiceId(firstInvoice.id);
                                      setPayAmount(firstInvoice.amount.toString());
                                      setPayCustomDesc(firstInvoice.description);
                                    } else {
                                      setPayInvoiceId('');
                                      setPayAmount('');
                                      setPayCustomDesc('');
                                    }
                                    setShowPaymentModal(true);
                                  }}
                                >
                                  <DollarSign size={12} /> Collect Fee
                                </button>
                              </td>
                            </tr>
                          ));
                        } else {
                          return (
                            <tr>
                              <td colSpan={6} style={{textAlign: 'center', padding: '48px', color: 'var(--text-light)'}}>
                                No students with pending fees found in the selected class.
                              </td>
                            </tr>
                          );
                        }
                      })()}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        )}

        {/* --- 5. REPORTS PAGE --- */}
        {activeTab === 'reports' && (
          <div className="dashboard-content">
            <h2 style={{margin: 0, fontSize: '20px'}}>Financial & Academic Insights</h2>
            
            <div className="kpi-grid" style={{marginTop: '12px'}}>
              <div className="kpi-card blue">
                <div className="kpi-data">
                  <span className="kpi-label">Gross Billing</span>
                  <span className="kpi-value">₹{(totalFeesCollected + fees.filter(f => f.status === 'PENDING').reduce((sum, f) => sum + f.amount, 0)).toLocaleString('en-IN')}</span>
                </div>
                <div className="kpi-icon"><DollarSign size={20} /></div>
              </div>
              <div className="kpi-card green">
                <div className="kpi-data">
                  <span className="kpi-label">Settled Balance</span>
                  <span className="kpi-value">₹{totalFeesCollected.toLocaleString('en-IN')}</span>
                </div>
                <div className="kpi-icon"><CheckCircle size={20} /></div>
              </div>
              <div className="kpi-card red">
                <div className="kpi-data">
                  <span className="kpi-label">Outstanding Balance</span>
                  <span className="kpi-value">₹{fees.filter(f => f.status === 'PENDING').reduce((sum, f) => sum + f.amount, 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="kpi-icon"><AlertTriangle size={20} /></div>
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="panel">
                <h3 className="panel-title" style={{marginBottom: '16px'}}>Collection History Log</h3>
                <div className="fees-table-container">
                  <table className="fees-table">
                    <thead>
                      <tr>
                        <th>Transaction Title</th>
                        <th>Settlement Date</th>
                        <th>Status</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length > 0 ? (
                        transactions.map(tx => (
                          <tr key={tx.id}>
                            <td style={{fontWeight: 500}}>{tx.title}</td>
                            <td>{tx.date}</td>
                            <td><span className="badge paid">CREDIT</span></td>
                            <td className="due-amount" style={{color: tx.amount < 0 ? 'inherit' : 'var(--green-accent)'}}>
                              ₹{tx.amount.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{textAlign: 'center', padding: '24px', color: 'var(--text-light)'}}>
                            No transactions logged yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="panel">
                <h3 className="panel-title" style={{marginBottom: '16px'}}>Expense Allocation</h3>
                <div className="expenses-chart-container" style={{border: 'none', margin: 0, padding: 0}}>
                  <div className="chart-wrapper">
                    <svg width="100%" height="100%" viewBox="0 0 40 40">
                      <circle cx="20" cy="20" r="15.915" fill="transparent" stroke="#E2E8F0" strokeWidth="4"></circle>
                      <circle cx="20" cy="20" r="15.915" fill="transparent" stroke="var(--blue-accent)" strokeWidth="4" strokeDasharray="45 55" strokeDashoffset="0"></circle>
                      <circle cx="20" cy="20" r="15.915" fill="transparent" stroke="var(--green-accent)" strokeWidth="4" strokeDasharray="25 75" strokeDashoffset="-45"></circle>
                      <circle cx="20" cy="20" r="15.915" fill="transparent" stroke="#F59E0B" strokeWidth="4" strokeDasharray="15 85" strokeDashoffset="-70"></circle>
                      <circle cx="20" cy="20" r="15.915" fill="transparent" stroke="#CBD5E1" strokeWidth="4" strokeDasharray="15 85" strokeDashoffset="-85"></circle>
                    </svg>
                    <div className="chart-center-label">
                      <span style={{fontSize: '11px', color: 'var(--text-light)'}}>Operating Exp</span>
                      <span style={{fontSize: '16px', fontWeight: 700, marginTop: '2px'}}>₹6.2L</span>
                    </div>
                  </div>
                  <div className="chart-legend" style={{marginTop: '24px'}}>
                    <div className="legend-item"><span className="legend-dot maintenance"></span><span>Maintenance (25%)</span></div>
                    <div className="legend-item"><span className="legend-dot misc"></span><span>Misc Events (15%)</span></div>
                    <div className="legend-item"><span className="legend-dot salary"></span><span>Staff Salary (45%)</span></div>
                    <div className="legend-item"><span className="legend-dot utilities"></span><span>Utilities (15%)</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- 6. SETTINGS PAGE --- */}
        {activeTab === 'settings' && (
          <div className="dashboard-content">
            <h2 style={{margin: 0, fontSize: '20px'}}>Configuration & Sync</h2>
            <p style={{fontSize: '12px', color: 'var(--text-light)', marginTop: '4px'}}>Configure school settings and verify Supabase synchronization status.</p>

            <div className="settings-grid" style={{marginTop: '20px'}}>
              
              {/* Left Column: DB Sync and SQL Schema */}
              <div className="panel" style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                {(() => {
                  const allTablesSynced = tableStatus.students && tableStatus.teachers && tableStatus.fees && tableStatus.fee_payments;
                  return (
                    <>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <h3 className="panel-title" style={{margin: 0}}>PostgreSQL Database Schema</h3>
                        {allTablesSynced && (
                          <button 
                            onClick={() => setShowSchemaSetup(!showSchemaSetup)}
                            style={{
                              padding: '6px 12px', fontSize: '11px', borderRadius: '6px',
                              border: '1px solid var(--border-color)', backgroundColor: 'transparent',
                              color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer'
                            }}
                          >
                            {showSchemaSetup ? 'Hide SQL Code' : 'View SQL Setup'}
                          </button>
                        )}
                      </div>

                      {(!allTablesSynced || showSchemaSetup) ? (
                        <>
                          <p style={{fontSize: '13px', lineHeight: 1.5, margin: 0, color: 'var(--text-muted)'}}>
                            If you haven't created the database tables yet, copy the SQL below, navigate to your **Supabase Dashboard &rarr; SQL Editor**, paste it and click **Run**.
                          </p>

                          <div style={{position: 'relative'}}>
                            <button 
                              onClick={copySqlToClipboard}
                              style={{
                                position: 'absolute',
                                right: '12px',
                                top: '12px',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                borderRadius: '4px',
                                color: '#fff',
                                padding: '6px 10px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {copiedSql ? <CheckCircle size={12} /> : <Copy size={12} />}
                              {copiedSql ? 'Copied!' : 'Copy SQL'}
                            </button>
                            <pre className="sql-box">{sqlSchema}</pre>
                          </div>
                        </>
                      ) : (
                        <div style={{
                          backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0',
                          padding: '16px', borderRadius: '8px', display: 'flex', 
                          alignItems: 'center', gap: '10px', color: '#065F46'
                        }}>
                          <CheckCircle size={18} style={{flexShrink: 0}} />
                          <div style={{fontSize: '13px'}}>
                            <strong>Database Ready:</strong> All required database tables are created and synced. No further schema setup is required.
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                <div style={{borderTop: '1px solid var(--border-color)', paddingTop: '20px'}}>
                  <h4 style={{margin: '0 0 8px 0', fontSize: '14px'}}>Developer Utilities</h4>
                  <p style={{fontSize: '12px', color: 'var(--text-light)', marginBottom: '12px'}}>
                    Populate your connected Supabase tables with initial mock entries to skip manual registrations.
                  </p>
                  <button 
                    className="btn-quick-action" 
                    onClick={handleSeedDatabase}
                    disabled={!isDbConnected}
                    style={{opacity: isDbConnected ? 1 : 0.5, cursor: isDbConnected ? 'pointer' : 'not-allowed'}}
                  >
                    Seed Database with Test Data
                  </button>
                </div>
              </div>

              {/* Right Column: Connection Health Monitor */}
              <div className="panel" style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                <h3 className="panel-title">Connection Status</h3>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: isDbConnected && session ? '#ECFDF5' : '#FEF2F2',
                  border: `1px solid ${isDbConnected && session ? '#A7F3D0' : '#FCA5A5'}`,
                  padding: '16px',
                  borderRadius: '10px'
                }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: isDbConnected && session ? '#10B981' : '#EF4444',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700
                  }}>
                    {isDbConnected && session ? 'OK' : 'ERR'}
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                    <span style={{fontSize: '14px', fontWeight: 700}}>
                      {isDbConnected && session ? 'Connected to Supabase' : 'Offline / Local Demo'}
                    </span>
                    <span style={{fontSize: '11px', color: 'var(--text-light)'}}>
                      {isDbConnected && session ? 'Authenticated Active Session' : 'Bypassed login / offline state'}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 style={{margin: '0 0 10px 0', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.5px'}}>
                    Table Sync Health
                  </h4>
                  <div className="sync-status-row">
                    <span>students</span>
                    <span style={{color: tableStatus.students ? 'var(--green-accent)' : 'var(--red-accent)', fontWeight: 600}}>
                      {tableStatus.students ? '✓ Synced' : '✗ Table Missing'}
                    </span>
                  </div>
                  <div className="sync-status-row">
                    <span>teachers</span>
                    <span style={{color: tableStatus.teachers ? 'var(--green-accent)' : 'var(--red-accent)', fontWeight: 600}}>
                      {tableStatus.teachers ? '✓ Synced' : '✗ Table Missing'}
                    </span>
                  </div>
                  <div className="sync-status-row">
                    <span>fees</span>
                    <span style={{color: tableStatus.fees ? 'var(--green-accent)' : 'var(--red-accent)', fontWeight: 600}}>
                      {tableStatus.fees ? '✓ Synced' : '✗ Table Missing'}
                    </span>
                  </div>
                  <div className="sync-status-row">
                    <span>fee_payments</span>
                    <span style={{color: tableStatus.fee_payments ? 'var(--green-accent)' : 'var(--red-accent)', fontWeight: 600}}>
                      {tableStatus.fee_payments ? '✓ Synced' : '✗ Table Missing'}
                    </span>
                  </div>
                </div>

                 <button 
                  className="btn-quick-action" 
                  onClick={() => { checkTableStatus(); loadAllData(); }}
                  style={{width: '100%', textAlign: 'center', padding: '10px'}}
                >
                  Force Connection Refresh
                </button>
              </div>

              {/* Transport Distance Slabs Panel */}
              <div className="panel" style={{gridColumn: 'span 2', marginTop: '12px'}}>
                <h3 className="panel-title" style={{marginBottom: '6px'}}>Transport Distance Slabs Configuration</h3>
                <p style={{fontSize: '12px', color: 'var(--text-light)', marginBottom: '16px'}}>
                  Define travel distance slabs in kilometers and set corresponding monthly transport rates. These rates will automatically apply to student accounts.
                </p>

                <div style={{display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px'}}>
                  {/* Slabs Table */}
                  <div className="fees-table-container">
                    <table className="fees-table">
                      <thead>
                        <tr>
                          <th>Distance Slab</th>
                          <th>Monthly Fare (₹)</th>
                          <th style={{textAlign: 'right'}}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transportSlabs.length > 0 ? (
                          transportSlabs.map(slab => (
                            <tr key={slab.id}>
                              <td style={{fontWeight: 600}}>
                                {slab.min_km} - {slab.max_km} km
                              </td>
                              <td>₹{slab.fare.toLocaleString('en-IN')}</td>
                              <td style={{textAlign: 'right'}}>
                                <button 
                                  className="btn-quick-action" 
                                  style={{
                                    backgroundColor: 'var(--red-accent-bg)', 
                                    color: 'var(--red-accent)', 
                                    border: 'none', 
                                    padding: '4px 8px',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => {
                                    const updated = transportSlabs.filter(s => s.id !== slab.id);
                                    setTransportSlabs(updated);
                                    localStorage.setItem('transport_slabs', JSON.stringify(updated));
                                  }}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} style={{textAlign: 'center', color: 'var(--text-light)', padding: '16px'}}>
                              No distance slabs configured.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Slab Form */}
                  <div style={{
                    backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', 
                    border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '12px'
                  }}>
                    <h4 style={{margin: 0, fontSize: '13px', fontWeight: 600}}>Add Travel Distance Slab</h4>
                    
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                      <div className="filter-group">
                        <label className="filter-label">Min Distance (KM)</label>
                        <input 
                          type="number" className="input-text" placeholder="e.g. 0"
                          value={slabMinKm} onChange={(e) => setSlabMinKm(e.target.value)}
                        />
                      </div>
                      <div className="filter-group">
                        <label className="filter-label">Max Distance (KM)</label>
                        <input 
                          type="number" className="input-text" placeholder="e.g. 2"
                          value={slabMaxKm} onChange={(e) => setSlabMaxKm(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="filter-group">
                      <label className="filter-label">Monthly Fare (₹)</label>
                      <input 
                        type="number" className="input-text" placeholder="e.g. 500"
                        value={slabFare} onChange={(e) => setSlabFare(e.target.value)}
                      />
                    </div>

                    <button
                      className="btn-quick-action"
                      style={{backgroundColor: 'var(--blue-accent)', color: '#fff', width: '100%', padding: '10px', fontWeight: 600, border: 'none', cursor: 'pointer'}}
                      onClick={() => {
                        const min = parseFloat(slabMinKm);
                        const max = parseFloat(slabMaxKm);
                        const fare = parseFloat(slabFare);
                        if (isNaN(min) || isNaN(max) || isNaN(fare)) {
                          alert('Please enter valid numbers');
                          return;
                        }
                        const newSlab = {
                          id: Date.now().toString(),
                          min_km: min,
                          max_km: max,
                          fare: fare
                        };
                        const updated = [...transportSlabs, newSlab].sort((a, b) => a.min_km - b.min_km);
                        setTransportSlabs(updated);
                        localStorage.setItem('transport_slabs', JSON.stringify(updated));
                        setSlabMinKm('');
                        setSlabMaxKm('');
                        setSlabFare('');
                      }}
                    >
                      Add Slab Route
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* --- MODAL: CREATE FEE INVOICE --- */}
      {showInvoiceModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="panel" style={{width: '420px', padding: '28px', position: 'relative'}}>
            <button className="card-delete-btn" onClick={() => setShowInvoiceModal(false)}>
              <X size={20} />
            </button>
            <h3 className="panel-title" style={{fontSize: '18px', marginBottom: '20px'}}>Create Fee Invoice</h3>
            
            <form onSubmit={handleAddFeeInvoice} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <div className="filter-group">
                <label className="filter-label">Select Student</label>
                <select 
                  className="select-input" 
                  value={newFeeStudent} 
                  onChange={(e) => setNewFeeStudent(e.target.value)} 
                  required
                >
                  <option value="">-- Choose Student --</option>
                  {students.map(s => {
                    const fullName = `${s.first_name} ${s.last_name || ''}`.trim();
                    return (
                      <option key={s.id} value={fullName}>
                        {fullName} ({s.roll_number})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label">Fee Description</label>
                <input 
                  type="text" className="input-text" placeholder="e.g. Tuition Fees (Dec-Jan)"
                  value={newFeeDesc} onChange={(e) => setNewFeeDesc(e.target.value)} required
                />
              </div>
              <div className="filter-group">
                <label className="filter-label">Base Amount (₹)</label>
                <input 
                  type="number" className="input-text" placeholder="Amount in Rupees"
                  value={newFeeAmount} onChange={(e) => setNewFeeAmount(e.target.value)} required
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">Transport Route Fare</label>
                <select 
                  className="select-input"
                  value={newFeeTransportSlabId}
                  onChange={(e) => setNewFeeTransportSlabId(e.target.value)}
                >
                  <option value="student_default">Use Student Profile Default</option>
                  <option value="none">No Transport (₹0)</option>
                  {transportSlabs.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.min_km} - {s.max_km} km (₹{s.fare})
                    </option>
                  ))}
                </select>
              </div>

              {(() => {
                const selectedStudentData = students.find(s => `${s.first_name} ${s.last_name || ''}`.trim() === newFeeStudent);
                if (!selectedStudentData) return null;
                const base = parseFloat(newFeeAmount) || 0;
                const disc = selectedStudentData.discount_percentage || 0;
                
                let trans = selectedStudentData.transport_fare || 0;
                if (newFeeTransportSlabId === 'none') {
                  trans = 0;
                } else if (newFeeTransportSlabId !== 'student_default') {
                  const selectedSlab = transportSlabs.find(slab => slab.id === newFeeTransportSlabId);
                  if (selectedSlab) trans = selectedSlab.fare;
                }

                const discountAmt = base * (disc / 100);
                const netAmt = (base - discountAmt) + trans;
                return (
                  <div style={{
                    backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', 
                    border: '1px solid #E2E8F0', fontSize: '12px', display: 'flex', 
                    flexDirection: 'column', gap: '6px'
                  }}>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <span style={{color: 'var(--text-light)'}}>Base Fee Amount:</span>
                      <span style={{fontWeight: 600}}>₹{base.toLocaleString('en-IN')}</span>
                    </div>
                    {disc > 0 && (
                      <div style={{display: 'flex', justifyContent: 'space-between', color: 'var(--blue-accent)'}}>
                        <span>Discount ({disc}% - {selectedStudentData.discount_reason || 'Scholarship'}):</span>
                        <span>-₹{discountAmt.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div style={{display: 'flex', justifyContent: 'space-between', color: 'var(--green-accent)'}}>
                      <span>Transport Fare:</span>
                      <span>+₹{trans.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{borderTop: '1px solid #E2E8F0', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '13px'}}>
                      <span>Net Invoice Total:</span>
                      <span>₹{netAmt.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="filter-group">
                <label className="filter-label">Payment Status</label>
                <select className="select-input" value={newFeeStatus} onChange={(e) => setNewFeeStatus(e.target.value as any)}>
                  <option value="PENDING">PENDING</option>
                  <option value="PAID">PAID</option>
                </select>
              </div>
              <button 
                type="submit" 
                style={{
                  marginTop: '8px', backgroundColor: 'var(--sidebar-bg)', color: '#FFFFFF',
                  border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600,
                  fontSize: '14px', cursor: 'pointer'
                }}
              >
                Create Invoice
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: ADD STUDENT --- */}
      {showStudentModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="panel" style={{width: '420px', padding: '28px', position: 'relative'}}>
            <button className="card-delete-btn" onClick={() => setShowStudentModal(false)}>
              <X size={20} />
            </button>
            <h3 className="panel-title" style={{fontSize: '18px', marginBottom: '20px'}}>Register Student</h3>
            
            <form onSubmit={handleAddStudent} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                <div className="filter-group">
                  <label className="filter-label">First Name</label>
                  <input 
                    type="text" className="input-text" placeholder="First Name"
                    value={newStudentFirst} onChange={(e) => setNewStudentFirst(e.target.value)} required
                  />
                </div>
                <div className="filter-group">
                  <label className="filter-label">Last Name</label>
                  <input 
                    type="text" className="input-text" placeholder="Last Name"
                    value={newStudentLast} onChange={(e) => setNewStudentLast(e.target.value)}
                  />
                </div>
              </div>
              <div className="filter-group">
                <label className="filter-label">Roll Number / ID</label>
                <input 
                  type="text" className="input-text" placeholder="e.g. ROLL-105"
                  value={newStudentRoll} onChange={(e) => setNewStudentRoll(e.target.value)} required
                />
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                <div className="filter-group">
                  <label className="filter-label">Class</label>
                  <select className="select-input" value={newStudentClass} onChange={(e) => setNewStudentClass(e.target.value)}>
                    <option value="Class 10">Class 10</option>
                    <option value="Class 9">Class 9</option>
                    <option value="Class 8">Class 8</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label className="filter-label">Section</label>
                  <select className="select-input" value={newStudentSection} onChange={(e) => setNewStudentSection(e.target.value)}>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px'}}>
                <div className="filter-group">
                  <label className="filter-label">Discount Percentage (%)</label>
                  <input 
                    type="number" className="input-text" placeholder="e.g. 10" min="0" max="100"
                    value={newStudentDiscount} onChange={(e) => setNewStudentDiscount(e.target.value)}
                  />
                </div>
                <div className="filter-group">
                  <label className="filter-label">Transport Route (Distance)</label>
                  <select 
                    className="select-input"
                    value={newStudentTransportSlabId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewStudentTransportSlabId(val);
                      const selectedSlab = transportSlabs.find(s => s.id === val);
                      if (selectedSlab) {
                        setNewStudentTransport(selectedSlab.fare.toString());
                      } else {
                        setNewStudentTransport('0');
                      }
                    }}
                  >
                    <option value="">No Transport (₹0)</option>
                    {transportSlabs.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.min_km} - {s.max_km} km (₹{s.fare}/mo)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="filter-group">
                <label className="filter-label">Discount Reason / Scholarship Note</label>
                <input 
                  type="text" className="input-text" placeholder="e.g. Sibling Discount, Merit-based"
                  value={newStudentDiscountReason} onChange={(e) => setNewStudentDiscountReason(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                style={{
                  marginTop: '8px', backgroundColor: 'var(--sidebar-bg)', color: '#FFFFFF',
                  border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600,
                  fontSize: '14px', cursor: 'pointer'
                }}
              >
                Register Student
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: ADD TEACHER --- */}
      {showTeacherModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="panel" style={{width: '420px', padding: '28px', position: 'relative'}}>
            <button className="card-delete-btn" onClick={() => setShowTeacherModal(false)}>
              <X size={20} />
            </button>
            <h3 className="panel-title" style={{fontSize: '18px', marginBottom: '20px'}}>Register Staff Member</h3>
            
            <form onSubmit={handleAddTeacher} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                <div className="filter-group">
                  <label className="filter-label">First Name</label>
                  <input 
                    type="text" className="input-text" placeholder="First Name"
                    value={newTeacherFirst} onChange={(e) => setNewTeacherFirst(e.target.value)} required
                  />
                </div>
                <div className="filter-group">
                  <label className="filter-label">Last Name</label>
                  <input 
                    type="text" className="input-text" placeholder="Last Name"
                    value={newTeacherLast} onChange={(e) => setNewTeacherLast(e.target.value)}
                  />
                </div>
              </div>
              <div className="filter-group">
                <label className="filter-label">Subject</label>
                <input 
                  type="text" className="input-text" placeholder="e.g. Mathematics"
                  value={newTeacherSubject} onChange={(e) => setNewTeacherSubject(e.target.value)} required
                />
              </div>
              <div className="filter-group">
                <label className="filter-label">Phone Number</label>
                <input 
                  type="text" className="input-text" placeholder="e.g. 9876543210"
                  value={newTeacherPhone} onChange={(e) => setNewTeacherPhone(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label className="filter-label">Email Address</label>
                <input 
                  type="email" className="input-text" placeholder="e.g. name@school.com"
                  value={newTeacherEmail} onChange={(e) => setNewTeacherEmail(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label className="filter-label">Salary (₹)</label>
                <input 
                  type="number" className="input-text" placeholder="e.g. 35000"
                  value={newTeacherSalary} onChange={(e) => setNewTeacherSalary(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                style={{
                  marginTop: '8px', backgroundColor: 'var(--sidebar-bg)', color: '#FFFFFF',
                  border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600,
                  fontSize: '14px', cursor: 'pointer'
                }}
              >
                Register Staff
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: COLLECT FEE PAYMENT --- */}
      {showPaymentModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="panel" style={{width: '440px', padding: '28px', position: 'relative'}}>
            <button className="card-delete-btn" onClick={() => {
              setPayStudentId('');
              setPayInvoiceId('');
              setPayCustomDesc('');
              setPayAmount('');
              setPayNotes('');
              setShowPaymentModal(false);
            }}>
              <X size={20} />
            </button>
            <h3 className="panel-title" style={{fontSize: '18px', marginBottom: '20px'}}>Collect Fee Payment</h3>
            
            <form onSubmit={handleCollectFeePayment} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <div className="filter-group">
                <label className="filter-label">Select Student</label>
                <select 
                  className="select-input" 
                  value={payStudentId} 
                  onChange={(e) => {
                    setPayStudentId(e.target.value);
                    setPayInvoiceId('');
                    setPayCustomDesc('');
                    setPayAmount('');
                  }}
                  required
                >
                  <option value="">-- Choose Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name || ''} ({s.roll_number})
                    </option>
                  ))}
                </select>
              </div>

              {payStudentId && (
                <div className="filter-group">
                  <label className="filter-label">Select Invoice to Pay</label>
                  <select 
                    className="select-input"
                    value={payInvoiceId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPayInvoiceId(val);
                      if (val !== 'custom' && val !== '') {
                        const selectedInv = fees.find(f => String(f.id) === String(val));
                        if (selectedInv) {
                          setPayAmount(selectedInv.amount.toString());
                          setPayCustomDesc(selectedInv.description);
                        }
                      } else {
                        setPayAmount('');
                        setPayCustomDesc('');
                      }
                    }}
                    required
                  >
                    <option value="">-- Choose Option --</option>
                    {fees.filter(f => 
                      f.status === 'PENDING' && 
                      f.student_name.toLowerCase() === `${students.find(s => String(s.id) === String(payStudentId))?.first_name} ${students.find(s => String(s.id) === String(payStudentId))?.last_name || ''}`.trim().toLowerCase()
                    ).map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.description} (Due: ₹{inv.amount})
                      </option>
                    ))}
                    <option value="custom">Direct Payment / Custom Bill</option>
                  </select>
                </div>
              )}

              {(payInvoiceId === 'custom' || !payInvoiceId) && payStudentId && (
                <>
                  <div className="filter-group">
                    <label className="filter-label">Payment Description</label>
                    <input 
                      type="text" className="input-text" placeholder="e.g. Special Activity Fees"
                      value={payCustomDesc} onChange={(e) => setPayCustomDesc(e.target.value)} required
                    />
                  </div>
                  <div className="filter-group">
                    <label className="filter-label">Transport Route Fare</label>
                    <select 
                      className="select-input"
                      value={payTransportSlabId}
                      onChange={(e) => setPayTransportSlabId(e.target.value)}
                    >
                      <option value="student_default">Use Student Profile Default</option>
                      <option value="none">No Transport (₹0)</option>
                      {transportSlabs.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.min_km} - {s.max_km} km (₹{s.fare})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {payStudentId && (
                <>
                  <div className="filter-group">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px'}}>
                      <label className="filter-label" style={{margin: 0}}>Amount Received (₹)</label>
                      {payInvoiceId === 'custom' && (() => {
                        const s = students.find(stud => String(stud.id) === String(payStudentId));
                        if (s && ((s.discount_percentage && s.discount_percentage > 0) || (s.transport_fare && s.transport_fare > 0) || payTransportSlabId !== 'none')) {
                          return (
                            <a 
                              onClick={() => {
                                const base = parseFloat(payAmount) || 0;
                                const disc = s.discount_percentage || 0;
                                
                                let trans = s.transport_fare || 0;
                                if (payTransportSlabId === 'none') {
                                  trans = 0;
                                } else if (payTransportSlabId !== 'student_default') {
                                  const selectedSlab = transportSlabs.find(slab => slab.id === payTransportSlabId);
                                  if (selectedSlab) trans = selectedSlab.fare;
                                }

                                setPayAmount(((base * (1 - disc / 100)) + trans).toString());
                              }}
                              style={{fontSize: '11px', color: 'var(--blue-accent)', cursor: 'pointer', fontWeight: 600}}
                            >
                              Apply Discount & Transport
                            </a>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <input 
                      type="number" className="input-text" placeholder="e.g. 5000"
                      value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                      disabled={payInvoiceId !== 'custom' && payInvoiceId !== ''}
                      required
                    />
                  </div>

                  {payInvoiceId === 'custom' && (() => {
                    const s = students.find(stud => String(stud.id) === String(payStudentId));
                    if (!s) return null;
                    const base = parseFloat(payAmount) || 0;
                    const disc = s.discount_percentage || 0;
                    
                    let trans = s.transport_fare || 0;
                    if (payTransportSlabId === 'none') {
                      trans = 0;
                    } else if (payTransportSlabId !== 'student_default') {
                      const selectedSlab = transportSlabs.find(slab => slab.id === payTransportSlabId);
                      if (selectedSlab) trans = selectedSlab.fare;
                    }

                    const discountAmt = base * (disc / 100);
                    const netAmt = (base - discountAmt) + trans;
                    return (
                      <div style={{
                        backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', 
                        border: '1px solid #E2E8F0', fontSize: '11px', display: 'flex', 
                        flexDirection: 'column', gap: '6px'
                      }}>
                        <div style={{display: 'flex', justifyContent: 'space-between'}}>
                          <span style={{color: 'var(--text-light)'}}>Base Custom Fee:</span>
                          <span style={{fontWeight: 600}}>₹{base.toLocaleString('en-IN')}</span>
                        </div>
                        {disc > 0 && (
                          <div style={{display: 'flex', justifyContent: 'space-between', color: 'var(--blue-accent)'}}>
                            <span>Discount ({disc}% - {s.discount_reason || 'Scholarship'}):</span>
                            <span>-₹{discountAmt.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        <div style={{display: 'flex', justifyContent: 'space-between', color: 'var(--green-accent)'}}>
                          <span>Transport Fare:</span>
                          <span>+₹{trans.toLocaleString('en-IN')}</span>
                        </div>
                        <div style={{borderTop: '1px solid #E2E8F0', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '12px'}}>
                          <span>Net Collected:</span>
                          <span>₹{netAmt.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px'}}>
                    <div className="filter-group">
                      <label className="filter-label">Payment Method</label>
                      <select className="select-input" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>

                    <div className="filter-group">
                      <label className="filter-label">Transaction Ref / Notes</label>
                      <input 
                        type="text" className="input-text" placeholder="e.g. Txn ID or Receipt #"
                        value={payNotes} onChange={(e) => setPayNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    style={{
                      marginTop: '8px', backgroundColor: 'var(--green-accent)', color: '#FFFFFF',
                      border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600,
                      fontSize: '14px', cursor: 'pointer'
                    }}
                  >
                    Confirm Collection
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: STUDENT DETAILS & LEDGER --- */}
      {selectedStudentLedger && (() => {
        const studentFullName = `${selectedStudentLedger.first_name} ${selectedStudentLedger.last_name || ''}`.trim();
        const studentInvoices = fees.filter(f => f.student_name.toLowerCase() === studentFullName.toLowerCase());
        const pendingInvoices = studentInvoices.filter(f => f.status === 'PENDING');
        
        const totalBilled = studentInvoices.reduce((sum, f) => sum + f.amount, 0);
        const totalPaid = studentInvoices.filter(f => f.status === 'PAID').reduce((sum, f) => sum + f.amount, 0);
        const totalOutstanding = studentInvoices.filter(f => f.status === 'PENDING').reduce((sum, f) => sum + f.amount, 0);

        const studentPayments = transactions.filter(t => 
          t.title.toLowerCase().includes(studentFullName.toLowerCase())
        );

        return (
          <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}>
            <div className="panel" style={{width: '600px', padding: '28px', position: 'relative', maxHeight: '90vh', overflowY: 'auto'}}>
              <button className="card-delete-btn" onClick={() => setSelectedStudentLedger(null)}>
                <X size={20} />
              </button>
              
              {/* Header */}
              <div style={{display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px'}}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%', 
                  backgroundColor: 'var(--primary-accent-bg)', color: 'var(--primary-accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 600, fontSize: '18px'
                }}>
                  {selectedStudentLedger.first_name[0]}{selectedStudentLedger.last_name ? selectedStudentLedger.last_name[0] : ''}
                </div>
                <div>
                  <h3 style={{margin: 0, fontSize: '20px', fontWeight: 700}}>{studentFullName}</h3>
                  <p style={{margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-light)'}}>
                    Roll No: {selectedStudentLedger.roll_number} | Class: {selectedStudentLedger.class_name} ({selectedStudentLedger.section_name})
                  </p>
                  {((selectedStudentLedger.discount_percentage && selectedStudentLedger.discount_percentage > 0) || (selectedStudentLedger.transport_fare && selectedStudentLedger.transport_fare > 0)) && (
                    <div style={{display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap'}}>
                      {selectedStudentLedger.discount_percentage && selectedStudentLedger.discount_percentage > 0 ? (
                        <span style={{
                          fontSize: '11px', fontWeight: 600, color: 'var(--blue-accent)',
                          backgroundColor: 'var(--blue-accent-bg)', padding: '3px 8px', borderRadius: '4px'
                        }} title={selectedStudentLedger.discount_reason || 'Scholarship'}>
                          Discount: {selectedStudentLedger.discount_percentage}% ({selectedStudentLedger.discount_reason || 'Scholarship'})
                        </span>
                      ) : null}
                      {selectedStudentLedger.transport_fare && selectedStudentLedger.transport_fare > 0 ? (
                        <span style={{
                          fontSize: '11px', fontWeight: 600, color: 'var(--green-accent)',
                          backgroundColor: 'var(--green-accent-bg)', padding: '3px 8px', borderRadius: '4px'
                        }}>
                          Transport: ₹{selectedStudentLedger.transport_fare.toLocaleString('en-IN')}/mo
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              {/* Ledger Statistics Cards */}
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px'}}>
                <div style={{backgroundColor: '#F8FAFC', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E2E8F0'}}>
                  <span style={{fontSize: '11px', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase'}}>Total Billed</span>
                  <div style={{fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px'}}>₹{totalBilled.toLocaleString('en-IN')}</div>
                </div>
                <div style={{backgroundColor: '#ECFDF5', padding: '12px 16px', borderRadius: '8px', border: '1px solid #A7F3D0'}}>
                  <span style={{fontSize: '11px', color: '#047857', fontWeight: 600, textTransform: 'uppercase'}}>Total Paid</span>
                  <div style={{fontSize: '18px', fontWeight: 700, color: '#065F46', marginTop: '4px'}}>₹{totalPaid.toLocaleString('en-IN')}</div>
                </div>
                <div style={{backgroundColor: totalOutstanding > 0 ? '#FEF2F2' : '#F8FAFC', padding: '12px 16px', borderRadius: '8px', border: totalOutstanding > 0 ? '1px solid #FCA5A5' : '1px solid #E2E8F0'}}>
                  <span style={{fontSize: '11px', color: totalOutstanding > 0 ? '#B91C1C' : 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase'}}>Outstanding</span>
                  <div style={{fontSize: '18px', fontWeight: 700, color: totalOutstanding > 0 ? '#991B1B' : 'var(--text-primary)', marginTop: '4px'}}>₹{totalOutstanding.toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Section 1: Outstanding Invoices */}
              <div style={{marginBottom: '24px'}}>
                <h4 style={{margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px'}}>Pending Invoices</h4>
                {pendingInvoices.length > 0 ? (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {pendingInvoices.map(inv => (
                      <div key={inv.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#FFFBEB', borderRadius: '6px', border: '1px solid #FDE68A'}}>
                        <div>
                          <span style={{fontWeight: 600, fontSize: '13px', display: 'block'}}>{inv.description}</span>
                          <span style={{fontSize: '11px', color: 'var(--text-light)'}}>{inv.term}</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                          <span style={{fontWeight: 700, fontSize: '14px'}}>₹{inv.amount.toLocaleString('en-IN')}</span>
                          <button 
                            className="btn-quick-action" 
                            style={{padding: '4px 8px', fontSize: '11px', border: 'none', cursor: 'pointer'}}
                            onClick={() => {
                              setSelectedStudentLedger(null);
                              setPayStudentId(selectedStudentLedger.id);
                              setPayInvoiceId(inv.id);
                              setPayAmount(inv.amount.toString());
                              setPayCustomDesc(inv.description);
                              setShowPaymentModal(true);
                            }}
                          >
                            Collect
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{fontSize: '12px', color: 'var(--text-light)', margin: 0}}>No pending invoices. Student is all cleared!</p>
                )}
              </div>

              {/* Section 2: Payment History Ledger */}
              <div>
                <h4 style={{margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px'}}>Payment History & Transactions</h4>
                {studentPayments.length > 0 ? (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {studentPayments.map(t => (
                      <div key={t.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0'}}>
                        <div>
                          <span style={{fontWeight: 600, fontSize: '13px', display: 'block'}}>{t.title}</span>
                          <span style={{fontSize: '11px', color: 'var(--text-light)'}}>{t.date}</span>
                        </div>
                        <span style={{fontWeight: 700, fontSize: '14px', color: 'var(--green-accent)'}}>+₹{t.amount.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{fontSize: '12px', color: 'var(--text-light)', margin: 0}}>No transaction records found for this student.</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- MODAL: TEACHER DETAILS & LEDGER --- */}
      {selectedTeacherLedger && (() => {
        const teacherFullName = `${selectedTeacherLedger.first_name} ${selectedTeacherLedger.last_name || ''}`.trim();
        const salaryVal = selectedTeacherLedger.salary !== undefined ? selectedTeacherLedger.salary : 35000;
        
        const teacherPayments = transactions.filter(t => 
          t.type === 'salary' && t.title.toLowerCase().includes(teacherFullName.toLowerCase())
        );

        const totalSalaryPaidYtd = teacherPayments.reduce((sum, t) => sum + Math.abs(t.amount), 0);

        return (
          <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}>
            <div className="panel" style={{width: '600px', padding: '28px', position: 'relative', maxHeight: '90vh', overflowY: 'auto'}}>
              <button className="card-delete-btn" onClick={() => setSelectedTeacherLedger(null)}>
                <X size={20} />
              </button>
              
              {/* Header */}
              <div style={{display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px'}}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%', 
                  backgroundColor: 'var(--green-accent-bg)', color: 'var(--green-accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 600, fontSize: '18px'
                }}>
                  {selectedTeacherLedger.first_name[0]}{selectedTeacherLedger.last_name ? selectedTeacherLedger.last_name[0] : ''}
                </div>
                <div>
                  <h3 style={{margin: 0, fontSize: '20px', fontWeight: 700}}>{teacherFullName}</h3>
                  <p style={{margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-light)'}}>
                    Subject: {selectedTeacherLedger.subject} | Email: {selectedTeacherLedger.email || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Salary Statistics Cards */}
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px'}}>
                <div style={{backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0'}}>
                  <span style={{fontSize: '11px', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase'}}>Monthly Salary</span>
                  <div style={{fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px'}}>₹{salaryVal.toLocaleString('en-IN')}</div>
                </div>
                <div style={{backgroundColor: '#ECFDF5', padding: '16px', borderRadius: '8px', border: '1px solid #A7F3D0'}}>
                  <span style={{fontSize: '11px', color: '#047857', fontWeight: 600, textTransform: 'uppercase'}}>Total Paid YTD</span>
                  <div style={{fontSize: '20px', fontWeight: 700, color: '#065F46', marginTop: '4px'}}>₹{totalSalaryPaidYtd.toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Section 1: Disburse Salary Action */}
              <div style={{backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <span style={{fontWeight: 600, fontSize: '14px', color: '#166534', display: 'block'}}>Disburse Monthly Salary</span>
                  <span style={{fontSize: '12px', color: '#15803d'}}>Log a salary transaction for the current month.</span>
                </div>
                <button 
                  className="btn-quick-action" 
                  style={{
                    padding: '8px 16px', fontSize: '13px', display: 'flex', 
                    alignItems: 'center', gap: '6px', backgroundColor: 'var(--green-accent)', 
                    color: '#FFFFFF', border: 'none', cursor: 'pointer'
                  }}
                  onClick={async () => {
                    const desc = `Salary payment to ${teacherFullName}`;
                    const newTx: Transaction = {
                      id: Date.now().toString(),
                      title: desc,
                      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                      amount: -salaryVal,
                      type: 'salary'
                    };
                    
                    setTransactions(prev => [newTx, ...prev]);
                    alert(`Salary payment of ₹${salaryVal.toLocaleString('en-IN')} logged successfully for ${teacherFullName}!`);
                  }}
                >
                  <DollarSign size={14} /> Pay Salary
                </button>
              </div>

              {/* Section 2: Salary Disbursement History */}
              <div>
                <h4 style={{margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px'}}>Salary Payment History</h4>
                {teacherPayments.length > 0 ? (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {teacherPayments.map(t => (
                      <div key={t.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0'}}>
                        <div>
                          <span style={{fontWeight: 600, fontSize: '13px', display: 'block'}}>{t.title}</span>
                          <span style={{fontSize: '11px', color: 'var(--text-light)'}}>{t.date}</span>
                        </div>
                        <span style={{fontWeight: 700, fontSize: '14px', color: '#B91C1C'}}>-₹{Math.abs(t.amount).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{fontSize: '12px', color: 'var(--text-light)', margin: 0}}>No salary payment records found for this teacher.</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- MODAL: FEE RECEIPT --- */}
      {receiptInvoice && (() => {
        const student = students.find(s =>
          `${s.first_name} ${s.last_name || ''}`.trim().toLowerCase() === receiptInvoice.student_name.toLowerCase()
        );
        const receiptNo = `RCP-${String(receiptInvoice.id).slice(-6).toUpperCase()}`;
        const receiptDate = receiptInvoice.created_at
          ? new Date(receiptInvoice.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
          : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

        const handlePrint = () => {
          const printContent = document.getElementById('fee-receipt-content');
          if (!printContent) return;
          const win = window.open('', '_blank', 'width=700,height=900');
          if (!win) return;
          win.document.write(`
            <html>
              <head>
                <title>Fee Receipt - ${receiptInvoice.student_name}</title>
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1e293b; }
                  .receipt-wrap { max-width: 600px; margin: 0 auto; border: 2px solid #1e40af; border-radius: 12px; overflow: hidden; }
                  .receipt-header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 28px 32px; text-align: center; }
                  .receipt-header h1 { font-size: 22px; font-weight: 800; letter-spacing: 1px; }
                  .receipt-header p { font-size: 12px; opacity: 0.85; margin-top: 4px; }
                  .receipt-badge { display: inline-block; margin-top: 12px; background: rgba(255,255,255,0.2); padding: 4px 16px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1px; }
                  .receipt-body { padding: 28px 32px; }
                  .receipt-meta { display: flex; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px dashed #cbd5e1; }
                  .receipt-meta div { font-size: 12px; color: #64748b; }
                  .receipt-meta strong { font-size: 14px; color: #1e293b; display: block; margin-top: 2px; }
                  .student-block { background: #f1f5f9; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
                  .student-block h3 { font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 8px; }
                  .student-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                  .student-grid div { font-size: 13px; }
                  .student-grid span { color: #64748b; display: block; font-size: 11px; }
                  .fee-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                  .fee-table th { background: #1e293b; color: white; padding: 10px 14px; font-size: 11px; text-align: left; }
                  .fee-table td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
                  .fee-table .total-row td { font-weight: 700; font-size: 14px; background: #f8fafc; }
                  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
                  .status-paid { background: #d1fae5; color: #065f46; }
                  .status-pending { background: #fee2e2; color: #991b1b; }
                  .receipt-footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 11px; color: #94a3b8; }
                  .receipt-footer strong { color: #475569; }
                  @media print { body { padding: 0; } .receipt-wrap { border-radius: 0; border: none; } }
                </style>
              </head>
              <body>
                ${printContent.innerHTML}
              </body>
            </html>
          `);
          win.document.close();
          win.focus();
          setTimeout(() => { win.print(); win.close(); }, 500);
        };

        return (
          <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1100,
            backdropFilter: 'blur(6px)'
          }}>
            <div style={{
              width: '640px', maxHeight: '92vh', overflowY: 'auto',
              backgroundColor: 'var(--panel-bg)', borderRadius: '16px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.25)', position: 'relative'
            }}>
              {/* Modal top action bar */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 24px', borderBottom: '1px solid var(--border-color)'
              }}>
                <span style={{fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <Printer size={18} style={{color: 'var(--blue-accent)'}} /> Fee Receipt Preview
                </span>
                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                  <button
                    onClick={handlePrint}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      backgroundColor: 'var(--blue-accent)', color: '#fff',
                      border: 'none', borderRadius: '8px', padding: '8px 18px',
                      fontWeight: 600, fontSize: '13px', cursor: 'pointer'
                    }}
                  >
                    <Printer size={14} /> Print / Download
                  </button>
                  <button
                    className="card-delete-btn"
                    onClick={() => setReceiptInvoice(null)}
                    style={{position: 'static'}}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Receipt Content (printable) */}
              <div id="fee-receipt-content" style={{padding: '24px'}}>
                <div className="receipt-wrap" style={{
                  border: '2px solid #1e40af', borderRadius: '12px',
                  overflow: 'hidden', fontFamily: "'Segoe UI', sans-serif"
                }}>
                  {/* School Header */}
                  <div style={{
                    background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                    color: 'white', padding: '28px 32px', textAlign: 'center'
                  }}>
                    <div style={{
                      width: '52px', height: '52px', borderRadius: '50%',
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '22px', fontWeight: 800, margin: '0 auto 12px'
                    }}>G</div>
                    <h1 style={{fontSize: '20px', fontWeight: 800, letterSpacing: '1px', margin: 0}}>
                      Global International School
                    </h1>
                    <p style={{fontSize: '12px', opacity: 0.85, marginTop: '4px'}}>
                      Excellence in Education · Established 2005
                    </p>
                    <div style={{
                      display: 'inline-block', marginTop: '12px',
                      background: 'rgba(255,255,255,0.2)', padding: '4px 20px',
                      borderRadius: '20px', fontSize: '11px', fontWeight: 700, letterSpacing: '1px'
                    }}>
                      OFFICIAL FEE RECEIPT
                    </div>
                  </div>

                  {/* Receipt Meta */}
                  <div style={{
                    padding: '20px 28px', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'flex-start',
                    borderBottom: '1px dashed #cbd5e1',
                    backgroundColor: '#f8fafc'
                  }}>
                    <div>
                      <div style={{fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Receipt No.</div>
                      <div style={{fontSize: '18px', fontWeight: 800, color: '#1e40af', marginTop: '2px'}}>{receiptNo}</div>
                    </div>
                    <div style={{textAlign: 'right'}}>
                      <div style={{fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Date</div>
                      <div style={{fontSize: '14px', fontWeight: 700, marginTop: '2px'}}>{receiptDate}</div>
                    </div>
                    <div style={{textAlign: 'right'}}>
                      <div style={{fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Status</div>
                      <div style={{marginTop: '4px'}}>
                        <span style={{
                          display: 'inline-block', padding: '4px 12px',
                          borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                          backgroundColor: receiptInvoice.status === 'PAID' ? '#d1fae5' : '#fee2e2',
                          color: receiptInvoice.status === 'PAID' ? '#065f46' : '#991b1b'
                        }}>
                          {receiptInvoice.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Student Info Block */}
                  <div style={{padding: '20px 28px', borderBottom: '1px solid #e2e8f0'}}>
                    <div style={{
                      fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                      color: '#94a3b8', letterSpacing: '0.8px', marginBottom: '12px'
                    }}>Student Information</div>
                    <div style={{
                      backgroundColor: '#f1f5f9', borderRadius: '8px',
                      padding: '16px 20px',
                      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px'
                    }}>
                      <div>
                        <div style={{fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px'}}>Student Name</div>
                        <div style={{fontSize: '14px', fontWeight: 700}}>{receiptInvoice.student_name}</div>
                      </div>
                      <div>
                        <div style={{fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px'}}>Roll Number</div>
                        <div style={{fontSize: '14px', fontWeight: 700}}>{student?.roll_number || 'N/A'}</div>
                      </div>
                      <div>
                        <div style={{fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px'}}>Class / Section</div>
                        <div style={{fontSize: '14px', fontWeight: 700}}>{student ? `${student.class_name} - ${student.section_name}` : 'N/A'}</div>
                      </div>
                      {student?.discount_percentage && student.discount_percentage > 0 && (
                        <div>
                          <div style={{fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px'}}>Scholarship / Discount</div>
                          <div style={{fontSize: '13px', fontWeight: 600, color: '#1d4ed8'}}>
                            {student.discount_percentage}% – {student.discount_reason || 'Scholarship'}
                          </div>
                        </div>
                      )}
                      <div>
                        <div style={{fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px'}}>Academic Term</div>
                        <div style={{fontSize: '13px', fontWeight: 600}}>{receiptInvoice.term}</div>
                      </div>
                    </div>
                  </div>

                  {/* Fee Details Table */}
                  <div style={{padding: '20px 28px', borderBottom: '1px solid #e2e8f0'}}>
                    <div style={{
                      fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                      color: '#94a3b8', letterSpacing: '0.8px', marginBottom: '12px'
                    }}>Fee Details</div>
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                      <thead>
                        <tr>
                          <th style={{background: '#1e293b', color: 'white', padding: '10px 14px', fontSize: '11px', textAlign: 'left', borderRadius: '6px 0 0 0'}}>Description</th>
                          <th style={{background: '#1e293b', color: 'white', padding: '10px 14px', fontSize: '11px', textAlign: 'left'}}>Term</th>
                          <th style={{background: '#1e293b', color: 'white', padding: '10px 14px', fontSize: '11px', textAlign: 'right', borderRadius: '0 6px 0 0'}}>Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{padding: '12px 14px', borderBottom: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 500}}>{receiptInvoice.description}</td>
                          <td style={{padding: '12px 14px', borderBottom: '1px solid #e2e8f0', fontSize: '13px', color: '#64748b'}}>{receiptInvoice.term}</td>
                          <td style={{padding: '12px 14px', borderBottom: '1px solid #e2e8f0', fontSize: '13px', textAlign: 'right', fontWeight: 600}}>
                            {receiptInvoice.amount.toLocaleString('en-IN')}
                          </td>
                        </tr>
                        {student?.transport_fare && student.transport_fare > 0 && (
                          <tr>
                            <td style={{padding: '12px 14px', borderBottom: '1px solid #e2e8f0', fontSize: '13px', color: '#16a34a', fontStyle: 'italic'}}>Transport Fare (Monthly)</td>
                            <td style={{padding: '12px 14px', borderBottom: '1px solid #e2e8f0', fontSize: '13px', color: '#64748b'}}>—</td>
                            <td style={{padding: '12px 14px', borderBottom: '1px solid #e2e8f0', fontSize: '13px', textAlign: 'right', color: '#16a34a', fontWeight: 600}}>
                              Included
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={2} style={{padding: '14px', backgroundColor: '#f8fafc', fontSize: '14px', fontWeight: 800, textAlign: 'right', color: '#1e293b'}}>
                            Total Amount Paid
                          </td>
                          <td style={{padding: '14px', backgroundColor: '#f8fafc', fontSize: '16px', fontWeight: 800, textAlign: 'right', color: '#1e40af'}}>
                            ₹{receiptInvoice.amount.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Footer */}
                  <div style={{
                    padding: '18px 28px', backgroundColor: '#f8fafc',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderTop: '1px solid #e2e8f0'
                  }}>
                    <div style={{fontSize: '11px', color: '#94a3b8'}}>
                      <strong style={{color: '#475569'}}>Global International School</strong><br />
                      This is a computer generated receipt.<br />
                      No signature required.
                    </div>
                    <div style={{textAlign: 'right'}}>
                      <div style={{
                        fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase',
                        letterSpacing: '0.5px', marginBottom: '4px'
                      }}>Authorised Signatory</div>
                      <div style={{
                        borderTop: '1px solid #cbd5e1', paddingTop: '4px',
                        fontSize: '12px', color: '#475569', fontWeight: 600
                      }}>School Administrator</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}

export default App;
