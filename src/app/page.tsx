'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAppStore, type View, type CartItem } from '@/lib/store';
import { api } from '@/lib/api';
import { applyTheme, removeTheme } from '@/lib/theme';
import {
  LayoutDashboard, ShoppingCart, FileText, Package, FolderOpen,
  Building2, Users, BarChart3, Search, LogOut, Plus, Minus,
  Trash2, X, Fullscreen, Maximize2, Coffee, Printer,
  ChevronDown, CircleDot, CreditCard, Banknote, Clock,
  TrendingUp, DollarSign, Receipt, Eye, Edit, MoreVertical,
  RefreshCw, CheckCircle, XCircle, AlertCircle, Loader2,
  ArrowUpDown, Filter, CalendarDays, Shield, Menu, UserCircle,
  Home, Store, ChevronLeft, Phone, MapPin, Hash, Percent,
  Sparkles, MousePointerClick, Keyboard, Settings, Upload, Palette, FileSignature, Globe, Info,
  QrCode, AlignLeft, AlignCenter, AlignRight, LayoutTemplate
} from 'lucide-react';

// shadcn/ui imports
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarRail, SidebarTrigger, SidebarInset
} from '@/components/ui/sidebar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';

// ─── Category emoji/icon mapping ───
const CATEGORY_EMOJIS: Record<string, string> = {
  coffee: '☕', tea: '🍵', juice: '🧃', cake: '🎂', pastry: '🥐',
  sandwich: '🥪', salad: '🥗', burger: '🍔', pizza: '🍕', pasta: '🍝',
  dessert: '🍮', icecream: '🍦', water: '💧', smoothie: '🥤', bread: '🍞',
  cheese: '🧀', egg: '🥚', soup: '🍲', rice: '🍚', fish: '🐟',
  chicken: '🍗', meat: '🥩', fruit: '🍎', vegetable: '🥦', snack: '🍿',
  chocolate: '🍫', candy: '🍬', donut: '🍩', croissant: '🥐', muffin: '🧁',
  default: '📦',
};

function getCategoryEmoji(categoryName?: string, categoryIcon?: string): string {
  if (categoryIcon && CATEGORY_EMOJIS[categoryIcon]) return CATEGORY_EMOJIS[categoryIcon];
  if (categoryName) {
    const key = categoryName.toLowerCase().trim();
    for (const [k, v] of Object.entries(CATEGORY_EMOJIS)) {
      if (key.includes(k)) return v;
    }
  }
  return CATEGORY_EMOJIS.default;
}

// ─── QueryClient ───
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1, refetchOnWindowFocus: false },
  },
});

// ─── Currency formatter ───
const fmt = (n: number) => (n ?? 0).toFixed(2);

// ─── Role helpers ───
function isOwner(role?: string) { return role === 'owner'; }
function isManager(role?: string) { return role === 'owner' || role === 'manager'; }

// ─── Animated page wrapper ───
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.15 } },
};

function AnimatedPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className={className}>
      {children}
    </motion.div>
  );
}

// ─── Status badge helpers ───
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: 'مدفوعة', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    pending: { label: 'معلقة', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    cancelled: { label: 'ملغاة', cls: 'bg-red-100 text-red-700 border-red-200' },
    open: { label: 'مفتوحة', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    held: { label: 'مؤجلة', cls: 'bg-purple-100 text-purple-700 border-purple-200' },
    active: { label: 'نشط', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    inactive: { label: 'غير نشط', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  };
  const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-600 border-gray-200' };
  return <Badge variant="outline" className={s.cls}>{s.label}</Badge>;
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    owner: { label: 'مالك', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    manager: { label: 'مدير', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    cashier: { label: 'كاشير', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  };
  const s = map[role] || { label: role, cls: 'bg-gray-100 text-gray-600 border-gray-200' };
  return <Badge variant="outline" className={s.cls}>{s.label}</Badge>;
}

// ─── Time Display ───
function TimeDisplay() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="text-xs text-muted-foreground font-mono">
      {time.toLocaleDateString('ar-SA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
      <span className="mx-1">|</span>
      {time.toLocaleTimeString('ar-SA')}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SETUP SCREEN (First-time setup when no data exists)
// ═══════════════════════════════════════════════════════
function SetupScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const setAuth = useAppStore(s => s.setAuth);

  // Step 1: Company info
  const [companyName, setCompanyName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchAddress, setBranchAddress] = useState('');

  // Step 2: Owner info
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleNext = () => {
    if (step === 1) {
      if (!companyName.trim()) { toast.error('يرجى إدخال اسم النشاط'); return; }
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerName.trim()) { toast.error('يرجى إدخال اسم المالك'); return; }
    if (!ownerEmail.trim()) { toast.error('يرجى إدخال البريد الإلكتروني'); return; }
    if (!ownerPassword || ownerPassword.length < 6) { toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    if (ownerPassword !== confirmPassword) { toast.error('كلمة المرور غير متطابقة'); return; }

    setLoading(true);
    try {
      const res = await api.setup({
        companyName: companyName.trim(),
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim(),
        ownerPassword,
        branchName: branchName.trim() || undefined,
        branchPhone: branchPhone.trim() || undefined,
        branchAddress: branchAddress.trim() || undefined,
      });
      setAuth(res.user, res.token, res.company, res.branch);
      toast.success(`مرحباً ${res.user.name}! تم إنشاء حسابك بنجاح`);
    } catch (err: any) {
      toast.error(err.message || 'فشل إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-lg"
      >
        <Card className="border-0 shadow-2xl shadow-amber-900/10 bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/25">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-l from-amber-700 to-amber-900 bg-clip-text text-transparent">
              إعداد CafePOS
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {step === 1 ? 'الخطوة 1 من 2: معلومات النشاط' : 'الخطوة 2 من 2: حساب المالك'}
            </CardDescription>
            {/* Progress bar */}
            <div className="flex gap-2 mt-3 px-4">
              <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-amber-500' : 'bg-gray-200'}`} />
              <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-amber-500' : 'bg-gray-200'}`} />
            </div>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>اسم النشاط *</Label>
                  <Input
                    placeholder="مثال: مقهى الأرواح"
                    value={companyName} onChange={e => setCompanyName(e.target.value)}
                    className="h-11 bg-amber-50/50 border-amber-200 focus:border-amber-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label>اسم الفرع</Label>
                  <Input
                    placeholder="الفرع الرئيسي"
                    value={branchName} onChange={e => setBranchName(e.target.value)}
                    className="h-11 bg-amber-50/50 border-amber-200 focus:border-amber-400"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>هاتف الفرع</Label>
                    <Input
                      placeholder="05xxxxxxxx" dir="ltr"
                      value={branchPhone} onChange={e => setBranchPhone(e.target.value)}
                      className="h-11 bg-amber-50/50 border-amber-200 focus:border-amber-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>عنوان الفرع</Label>
                    <Input
                      placeholder="المدينة - الحي"
                      value={branchAddress} onChange={e => setBranchAddress(e.target.value)}
                      className="h-11 bg-amber-50/50 border-amber-200 focus:border-amber-400"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleNext}
                  className="w-full h-11 bg-gradient-to-l from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-semibold shadow-lg shadow-amber-500/25 transition-all"
                >
                  التالي <ChevronLeft className="w-4 h-4 mr-1" />
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>اسم المالك *</Label>
                  <Input
                    placeholder="الاسم الكامل"
                    value={ownerName} onChange={e => setOwnerName(e.target.value)}
                    className="h-11 bg-amber-50/50 border-amber-200 focus:border-amber-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني *</Label>
                  <Input
                    type="email" placeholder="email@example.com" dir="ltr"
                    value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)}
                    className="h-11 bg-amber-50/50 border-amber-200 focus:border-amber-400"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>كلمة المرور *</Label>
                    <Input
                      type="password" placeholder="6 أحرف على الأقل" dir="ltr"
                      value={ownerPassword} onChange={e => setOwnerPassword(e.target.value)}
                      className="h-11 bg-amber-50/50 border-amber-200 focus:border-amber-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>تأكيد كلمة المرور *</Label>
                    <Input
                      type="password" placeholder="أعد كتابة كلمة المرور" dir="ltr"
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      className="h-11 bg-amber-50/50 border-amber-200 focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Summary card */}
                <div className="bg-amber-50/70 rounded-lg p-3 space-y-1 text-sm border border-amber-100">
                  <p className="font-semibold text-amber-800">ملخص:</p>
                  <p className="text-muted-foreground">
                    <span className="text-amber-700 font-medium">{companyName}</span>
                    {branchName ? ` — ${branchName}` : ''}
                  </p>
                  <p className="text-muted-foreground">
                    المالك: <span className="font-medium">{ownerName}</span> ({ownerEmail})
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button" variant="outline" onClick={handleBack}
                    className="h-11 flex-1"
                  >
                    <ChevronDown className="w-4 h-4 mr-1 rotate-90" /> رجوع
                  </Button>
                  <Button
                    type="submit"
                    className="h-11 flex-[2] bg-gradient-to-l from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="flex items-center"><CheckCircle className="w-4 h-4 ml-1" /> إنشاء الحساب</span>}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} CafePOS — جميع الحقوق محفوظة
        </p>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════
function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAppStore(s => s.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور'); return; }
    setLoading(true);
    try {
      const res = await api.login(email, password);
      setAuth(res.user, res.token, res.company, res.branch);
      toast.success(`مرحباً ${res.user.name}!`);
    } catch (err: any) {
      toast.error(err.message || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-2xl shadow-amber-900/10 bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/25">
              <Coffee className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-l from-amber-700 to-amber-900 bg-clip-text text-transparent">
              CafePOS
            </CardTitle>
            <CardDescription className="text-muted-foreground">نظام نقاط البيع للمقاهي والمطاعم</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email" type="email" placeholder="email@example.com" dir="ltr"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="h-11 bg-amber-50/50 border-amber-200 focus:border-amber-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password" type="password" placeholder="••••••••" dir="ltr"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="h-11 bg-amber-50/50 border-amber-200 focus:border-amber-400"
                />
              </div>
              <Button
                type="submit" className="w-full h-11 bg-gradient-to-l from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-semibold shadow-lg shadow-amber-500/25 transition-all"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تسجيل الدخول'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} CafePOS — جميع الحقوق محفوظة
        </p>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// RECEIPT PRINT COMPONENT
// ═══════════════════════════════════════════════════════
function ReceiptPrint({ invoice, onClose }: { invoice: any; onClose: () => void }) {
  const company = useAppStore(s => s.company);
  const branch = useAppStore(s => s.branch);
  const template = company?.receiptTemplate || 'simple';
  const align = company?.receiptAlign || 'center';
  const fontSize = Math.max(9, Math.min(14, company?.receiptFontSize || 11));
  const paper = company?.receiptPaper || (company?.receiptWidth === '58' ? 'thermal-58' : 'thermal-80');
  const paperClass = paper === 'a4' ? 'receipt-paper-a4' : paper === 'thermal-58' ? 'receipt-paper-58' : 'receipt-paper-80';
  const alignClass = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';
  const showTax = company?.showTaxOnReceipt !== false;
  const showDiscount = company?.showDiscountOnReceipt !== false;
  const showQr = company?.showQrOnReceipt === true;
  const qrPayload = `${company?.name || 'CafePOS'}|${invoice.invoiceNo || invoice.id}|${invoice.total}|${new Date(invoice.createdAt).toISOString()}`;

  useEffect(() => {
    setTimeout(() => window.print(), 300);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-white p-0 print:p-0 invoice-print-root">
      <div className="hidden print:block">
        <div className={`mx-auto p-2 font-mono receipt-print ${paperClass} template-${template}`} dir="rtl" style={{ fontFamily: 'monospace', fontSize: `${fontSize}px` }}>
          <div className={`${alignClass} mb-2`}>
            {company?.receiptShowLogo !== false && company?.logo && (
              <img src={company.logo} alt="logo" className="w-12 h-12 mx-auto mb-1 rounded-md object-cover" />
            )}
            <h1 className="text-base font-bold">{company?.name || 'المقهى'}</h1>
            <p className="text-[10px]">{branch?.name || ''}</p>
            <p className="text-[10px]">{branch?.address || ''}</p>
            <p className="text-[10px]">هاتف: {branch?.phone || ''}</p>
          </div>
          {company?.receiptHeader && <p className={`text-[10px] italic mb-2 ${alignClass}`}>{company.receiptHeader}</p>}
          <div className="border-t border-dashed border-gray-400 my-2" />
          <div className="flex justify-between text-[10px]">
            <span>فاتورة #{invoice.invoiceNo || invoice.id?.slice(-6)}</span>
            <span>{new Date(invoice.createdAt).toLocaleString('ar-SA')}</span>
          </div>
          <div className="text-[10px] mb-1">الكاشير: {invoice.user?.name || invoice.cashierName || '-'}</div>
          <div className="border-t border-dashed border-gray-400 my-2" />
          {(invoice.items || []).map((item: any, i: number) => (
            <div key={i} className="mb-1">
              <div className="flex justify-between text-[11px] font-bold">
                <span>{item.name}</span>
                <span>{fmt(item.price * item.quantity)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-600">
                <span>{fmt(item.price)} × {item.quantity}</span>
                <span />
              </div>
            </div>
          ))}
          <div className="border-t border-dashed border-gray-400 my-2" />
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between"><span>المجموع الفرعي</span><span>{fmt(invoice.subtotal)}</span></div>
            {showDiscount && invoice.discount > 0 && (
              <div className="flex justify-between text-red-600"><span>الخصم</span><span>-{fmt(invoice.discount)}</span></div>
            )}
            {showTax && <div className="flex justify-between"><span>الضريبة {(invoice.taxRate || 15)}%</span><span>{fmt(invoice.tax || invoice.taxAmount || 0)}</span></div>}
            <div className="border-t border-dashed border-gray-400 my-1" />
            <div className="flex justify-between text-sm font-bold text-base">
              <span>الإجمالي</span><span>{fmt(invoice.total)} {company?.currencySymbol || 'ر.س'}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span>طريقة الدفع</span>
              <span>{invoice.paymentMethod === 'cash' ? 'نقدي' : invoice.paymentMethod === 'card' ? 'بطاقة' : '-'}</span>
            </div>
            {invoice.paymentMethod === 'cash' && invoice.amountReceived > 0 && (
              <>
                <div className="flex justify-between"><span>المبلغ المدفوع</span><span>{fmt(invoice.amountReceived)}</span></div>
                <div className="flex justify-between font-bold"><span>الباقي</span><span>{fmt(invoice.change)}</span></div>
              </>
            )}
          </div>
          <div className="border-t border-dashed border-gray-400 my-2" />
          <div className="text-center text-[10px] mt-2">
            {showQr && (
              <div className="inline-block bg-white border rounded p-1 mb-1">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(qrPayload)}`}
                  alt="qr"
                  className="w-[72px] h-[72px]"
                />
              </div>
            )}
            <p>{company?.receiptFooter || 'شكراً لزيارتكم!'}</p>
            <p>نتمنى لكم يوماً سعيداً ☕</p>
          </div>
        </div>
      </div>
      {/* Screen-only close button */}
      <div className="print:hidden fixed bottom-8 left-1/2 -translate-x-1/2">
        <Button onClick={onClose} size="lg" className="bg-amber-600 hover:bg-amber-700">
          <X className="w-4 h-4 ml-2" /> إغلاق
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PAYMENT DIALOG
// ═══════════════════════════════════════════════════════
function PaymentDialog() {
  const { paymentDialogOpen, setPaymentDialogOpen, cart, getSubtotal, getTax, getTotal, discount, clearCart, currentInvoiceId, user, branch } = useAppStore();
  const [method, setMethod] = useState<'cash' | 'card'>('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [paying, setPaying] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [paidInvoice, setPaidInvoice] = useState<any>(null);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const qClient = useQueryClient();

  const subtotal = getSubtotal();
  const tax = getTax();
  const total = getTotal();
  const change = amountReceived ? Math.max(0, parseFloat(amountReceived) - total) : 0;

  // Fetch branches for owners who don't have a default branch
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-payment'],
    queryFn: () => api.getBranches(),
    enabled: paymentDialogOpen && user?.role === 'owner' && !user?.branchId,
  });

  // Auto-select first branch for owners
  useEffect(() => {
    if (user?.role === 'owner' && !user?.branchId && branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, user, selectedBranchId]);

  const effectiveBranchId = user?.branchId || selectedBranchId || branch?.id;

  const handlePay = async () => {
    if (method === 'cash' && parseFloat(amountReceived) < total) {
      toast.error('المبلغ المدفوع أقل من الإجمالي');
      return;
    }
    if (!effectiveBranchId) {
      toast.error('يرجى اختيار الفرع أولاً');
      return;
    }
    if (!currentInvoiceId && cart.length === 0) {
      toast.error('السلة فارغة');
      return;
    }
    setPaying(true);
    try {
      let invoice: any;

      if (currentInvoiceId) {
        // Existing invoice: pay it
        invoice = await api.payInvoice(currentInvoiceId, {
          method,
          amount: total,
          cashReceived: method === 'cash' ? parseFloat(amountReceived) : undefined,
        });
      } else {
        // New flow: create invoice first, then pay it
        const created = await api.createInvoice({
          branchId: effectiveBranchId,
          items: cart.map(c => ({ productId: c.productId, price: c.price, quantity: c.quantity })),
          discount,
        });

        // Now pay the invoice
        invoice = await api.payInvoice(created.id, {
          method,
          amount: total,
          cashReceived: method === 'cash' ? parseFloat(amountReceived) : undefined,
        });
      }

      setPaidInvoice(invoice);
      toast.success('تم الدفع بنجاح!');
      clearCart();
      qClient.invalidateQueries({ queryKey: ['invoices'] });
      qClient.invalidateQueries({ queryKey: ['dashboard'] });
      setPaymentDialogOpen(false);
      setShowReceipt(true);
    } catch (err: any) {
      toast.error(err.message || 'فشل عملية الدفع');
    } finally {
      setPaying(false);
    }
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (paymentDialogOpen) {
      setAmountReceived('');
      setMethod('cash');
    }
  }, [paymentDialogOpen]);

  if (showReceipt && paidInvoice) {
    return <ReceiptPrint invoice={paidInvoice} onClose={() => { setShowReceipt(false); setPaidInvoice(null); }} />;
  }

  return (
    <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-600" /> إتمام الدفع
          </DialogTitle>
          <DialogDescription>يرجى اختيار طريقة الدفع وإتمام العملية</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Branch selector for owners without a default branch */}
          {!user?.branchId && user?.role === 'owner' && branches.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">الفرع</Label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <Tabs value={method} onValueChange={(v) => setMethod(v as 'cash' | 'card')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cash" className="gap-2">
                <Banknote className="w-4 h-4" /> نقدي
              </TabsTrigger>
              <TabsTrigger value="card" className="gap-2">
                <CreditCard className="w-4 h-4" /> بطاقة
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="bg-amber-50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">المجموع الفرعي</span><span>{fmt(subtotal)} ر.س</span></div>
            {discount > 0 && <div className="flex justify-between text-red-600"><span>الخصم</span><span>-{fmt(discount)} ر.س</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">الضريبة 15%</span><span>{fmt(tax)} ر.س</span></div>
            <Separator />
            <div className="flex justify-between text-lg font-bold text-amber-800"><span>الإجمالي</span><span>{fmt(total)} ر.س</span></div>
          </div>

          {method === 'cash' && (
            <div className="space-y-2">
              <Label>المبلغ المدفوع</Label>
              <Input
                type="number" dir="ltr" placeholder="0.00"
                value={amountReceived} onChange={e => setAmountReceived(e.target.value)}
                className="text-lg h-12 font-mono"
                autoFocus
              />
              {amountReceived && parseFloat(amountReceived) >= total && (
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <span className="text-sm text-muted-foreground">الباقي</span>
                  <p className="text-xl font-bold text-emerald-700">{fmt(change)} ر.س</p>
                </div>
              )}
              {amountReceived && parseFloat(amountReceived) < total && parseFloat(amountReceived) > 0 && (
                <p className="text-sm text-red-600">المبلغ المدفوع أقل من الإجمالي بـ {fmt(total - parseFloat(amountReceived))} ر.س</p>
              )}
              {/* Quick cash buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[total, Math.ceil(total / 5) * 5, Math.ceil(total / 10) * 10, 50, 100, 200].filter((v, i, a) => a.indexOf(v) === i && v >= total).slice(0, 3).map(v => (
                  <Button key={v} variant="outline" onClick={() => setAmountReceived(String(v))} className="text-xs font-mono">
                    {fmt(v)}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {method === 'card' && (
            <div className="text-center py-6 text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-2 text-amber-300" />
              <p>سيتم إتمام الدفع عبر البطاقة</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>إلغاء</Button>
          <Button
            onClick={handlePay} disabled={paying || (method === 'cash' && (!amountReceived || parseFloat(amountReceived) < total))}
            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]"
          >
            {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 ml-1" /> تأكيد الدفع</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════
// POS VIEW
// ═══════════════════════════════════════════════════════
function POSView() {
  const { cart, addToCart, updateCartQuantity, removeFromCart, clearCart, getSubtotal, getTax, getTotal, discount, setDiscount, setPaymentDialogOpen, currentInvoiceId } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const searchRef = useRef<HTMLInputElement>(null);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  });

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products', selectedCategory],
    queryFn: () => api.getProducts(selectedCategory !== 'all' ? { categoryId: selectedCategory } : undefined),
  });

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter((p: any) => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
  }, [products, searchQuery]);

  const subtotal = getSubtotal();
  const tax = getTax();
  const total = getTotal();

  const handleProductClick = (product: any) => {
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      total: product.price,
    });
  };

  return (
    <div className="flex h-[calc(100vh-64px)] gap-0">
      {/* Left Panel - Products */}
      <div className="flex-1 flex flex-col min-w-0 border-l border-border">
        {/* Category Tabs */}
        <div className="border-b border-border bg-white px-4 py-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <Button
              size="sm" variant={selectedCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('all')}
              className={`shrink-0 rounded-full ${selectedCategory === 'all' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
            >
              <Package className="w-3.5 h-3.5 ml-1" /> الكل
            </Button>
            {categories.map((cat: any) => (
              <Button
                key={cat.id} size="sm" variant={selectedCategory === cat.id ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 rounded-full ${selectedCategory === cat.id ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
              >
                <span className="ml-1">{getCategoryEmoji(cat.name, cat.icon)}</span>
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-border bg-white">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="بحث عن منتج..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pr-9 h-10 bg-gray-50 border-gray-200"
              dir="rtl"
            />
            <kbd className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              Ctrl+K
            </kbd>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
          {productsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-[140px] rounded-xl" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Package className="w-12 h-12 mb-2 opacity-30" />
              <p className="text-sm">لا توجد منتجات</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredProducts.map((product: any) => (
                <motion.button
                  key={product.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleProductClick(product)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all p-4 flex flex-col items-center text-center gap-2 min-h-[140px] cursor-pointer group"
                >
                  <span className="text-3xl group-hover:scale-110 transition-transform">
                    {getCategoryEmoji(product.categoryName, product.categoryIcon)}
                  </span>
                  <div className="flex-1 flex items-center">
                    <p className="text-sm font-semibold text-gray-800 leading-snug">{product.name}</p>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <p className="text-base font-bold text-amber-700">{fmt(product.price)}</p>
                    <p className="text-[11px] text-muted-foreground">ر.س</p>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-[340px] shrink-0 flex flex-col bg-white border-r border-border hidden md:flex">
        {/* Cart Header */}
        <div className="px-4 py-3 border-b border-border bg-amber-50/50">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-amber-800 flex items-center gap-2">
              <Receipt className="w-4 h-4" /> الفاتورة الحالية
            </h3>
            {currentInvoiceId && (
              <Badge variant="outline" className="text-[10px] font-mono">#{currentInvoiceId.slice(-6)}</Badge>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">السلة فارغة</p>
                <p className="text-xs">اضغط على منتج لإضافته</p>
              </div>
            ) : (
              <AnimatePresence>
                {cart.map((item) => (
                  <motion.div
                    key={item.productId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-3 rounded-xl bg-gradient-to-l from-gray-50 to-white border border-gray-100 hover:border-[var(--theme-primary-200,#fde68a)] transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-relaxed">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{fmt(item.price)} ر.س</p>
                      </div>
                      <p className="text-sm font-bold shrink-0" style={{ color: 'var(--theme-primary-700,#92400e)' }}>{fmt(item.total)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-bold font-mono">{item.quantity}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeFromCart(item.productId)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>

        {/* Summary */}
        {cart.length > 0 && (
          <div className="border-t border-border p-4 space-y-3 bg-gray-50/50">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">المجموع الفرعي</span>
              <span>{fmt(subtotal)} ر.س</span>
            </div>
            <div className="flex items-center justify-between text-sm gap-2">
              <span className="text-muted-foreground">الخصم</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number" dir="ltr" value={discount || ''} placeholder="0"
                  onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-20 h-7 text-xs text-center font-mono"
                />
                <span className="text-xs text-muted-foreground">ر.س</span>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الضريبة 15%</span>
              <span>{fmt(tax)} ر.س</span>
            </div>
            <Separator />
            <div className="flex justify-between text-xl font-bold text-amber-800">
              <span>الإجمالي</span>
              <span>{fmt(total)} ر.س</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-3 space-y-2 border-t border-border">
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={clearCart} disabled={cart.length === 0}>
              <XCircle className="w-3.5 h-3.5 ml-1" /> إغلاق
            </Button>
            <Button variant="secondary" size="sm" className="text-xs" disabled={cart.length === 0}>
              <Clock className="w-3.5 h-3.5 ml-1" /> تأجيل
            </Button>
            <Button
              size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              onClick={() => setPaymentDialogOpen(true)}
              disabled={cart.length === 0}
            >
              <CheckCircle className="w-3.5 h-3.5 ml-1" /> دفع
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DASHBOARD VIEW
// ═══════════════════════════════════════════════════════
function DashboardView() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getSummary({ period: 'today' }),
  });
  const { data: salesData } = useQuery({
    queryKey: ['sales-chart', 'today'],
    queryFn: () => api.getSales({ period: 'daily', days: '7' }),
  });
  const { data: recentInvoicesRes, isLoading: invoicesLoading } = useQuery({
    queryKey: ['recent-invoices'],
    queryFn: () => api.getInvoices({ limit: '10', sort: 'newest' }),
  });
  const recentInvoices = recentInvoicesRes?.data || [];

  const summaryCards = [
    { title: 'مبيعات اليوم', value: `${fmt(summary?.totalSales || 0)} ر.س`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', iconBg: 'bg-emerald-100' },
    { title: 'عدد الفواتير', value: String(summary?.invoiceCount || 0), icon: Receipt, color: 'text-blue-600', bg: 'bg-blue-50', iconBg: 'bg-blue-100' },
    { title: 'متوسط الطلب', value: `${fmt(summary?.avgOrder || 0)} ر.س`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50', iconBg: 'bg-purple-100' },
    { title: 'أفضل منتج', value: summary?.topProduct || '—', icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50', iconBg: 'bg-amber-100' },
  ];

  return (
    <AnimatedPage className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">لوحة التحكم</h1>
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <CalendarDays className="w-3 h-3 ml-1" /> اليوم
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <div className={`text-xl font-bold mt-1 ${card.color}`}>{isLoading ? <Skeleton className="h-7 w-24" /> : card.value}</div>
                </div>
                <div className={`${card.iconBg} p-3 rounded-xl`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sales Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">المبيعات الأسبوعية</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <div className="h-[300px] flex items-end gap-2 pt-4">
              {(salesData?.data || []).slice(0, 7).map((d: any, i: number) => {
                const max = Math.max(...(salesData?.data || []).map((s: any) => s.totalSales || 0), 1);
                const h = Math.max(4, ((d.totalSales || 0) / max) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      className="w-full bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-md min-h-[4px]"
                    />
                    <span className="text-[10px] text-muted-foreground">{d.period || ''}</span>
                  </div>
                );
              })}
              {(salesData?.data || []).length === 0 && (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">أحدث الفواتير</CardTitle>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="space-y-2 py-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : !recentInvoices || recentInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">لا توجد فواتير</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.slice(0, 5).map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">#{inv.id?.slice(-6)}</TableCell>
                    <TableCell className="text-xs">{new Date(inv.createdAt).toLocaleString('ar-SA')}</TableCell>
                    <TableCell className="font-bold text-amber-700">{fmt(inv.total)} ر.س</TableCell>
                    <TableCell><StatusBadge status={inv.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AnimatedPage>
  );
}

// ═══════════════════════════════════════════════════════
// INVOICES VIEW
// ═══════════════════════════════════════════════════════
function InvoicesView() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter, page, search],
    queryFn: () => api.getInvoices({
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      ...(search ? { search } : {}),
      page: String(page), limit: '20',
    }),
  });

  const invoices = invoicesData?.data || invoicesData || [];
  const handleViewInvoice = async (id: string) => {
    try {
      const inv = await api.getInvoice(id);
      setSelectedInvoice(inv);
    } catch { toast.error('فشل تحميل الفاتورة'); }
  };

  if (showReceipt && selectedInvoice) {
    return <ReceiptPrint invoice={selectedInvoice} onClose={() => setShowReceipt(false)} />;
  }

  return (
    <AnimatedPage className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">الفواتير</h1>
        <div className="flex gap-2 items-center">
          <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="w-48 h-9" dir="rtl" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="paid">مدفوعة</SelectItem>
              <SelectItem value="pending">معلقة</SelectItem>
              <SelectItem value="cancelled">ملغاة</SelectItem>
              <SelectItem value="open">مفتوحة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">لا توجد فواتير</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الكاشير</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">#{inv.id?.slice(-6)}</TableCell>
                    <TableCell className="text-xs">{new Date(inv.createdAt).toLocaleString('ar-SA')}</TableCell>
                    <TableCell className="text-sm">{inv.cashierName || '-'}</TableCell>
                    <TableCell className="font-bold text-amber-700">{fmt(inv.total)} ر.س</TableCell>
                    <TableCell className="text-sm">{inv.paymentMethod === 'cash' ? 'نقدي' : inv.paymentMethod === 'card' ? 'بطاقة' : '-'}</TableCell>
                    <TableCell><StatusBadge status={inv.status} /></TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleViewInvoice(inv.id)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل الفاتورة #{selectedInvoice?.id?.slice(-6)}</DialogTitle>
            <DialogDescription>{new Date(selectedInvoice?.createdAt)?.toLocaleString('ar-SA')}</DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>السعر</TableHead>
                    <TableHead>المجموع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(selectedInvoice.items || []).map((item: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{fmt(item.price)}</TableCell>
                      <TableCell className="font-bold">{fmt(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="bg-amber-50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>المجموع الفرعي</span><span>{fmt(selectedInvoice.subtotal)} ر.س</span></div>
                {selectedInvoice.discount > 0 && <div className="flex justify-between text-red-600"><span>الخصم</span><span>-{fmt(selectedInvoice.discount)} ر.س</span></div>}
                <div className="flex justify-between"><span>الضريبة</span><span>{fmt(selectedInvoice.tax)} ر.س</span></div>
                <Separator />
                <div className="flex justify-between text-lg font-bold"><span>الإجمالي</span><span>{fmt(selectedInvoice.total)} ر.س</span></div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowReceipt(true)} className="flex-1">
                  <Printer className="w-4 h-4 ml-1" /> طباعة
                </Button>
                <Button variant="outline" onClick={() => setSelectedInvoice(null)} className="flex-1">إغلاق</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AnimatedPage>
  );
}

// ═══════════════════════════════════════════════════════
// PRODUCTS MANAGEMENT VIEW
// ═══════════════════════════════════════════════════════
function ProductsView() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [form, setForm] = useState({ name: '', sku: '', price: '', cost: '', categoryId: '', active: true });
  const qClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-manage', catFilter],
    queryFn: () => api.getProducts(catFilter !== 'all' ? { categoryId: catFilter } : undefined),
  });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => api.getCategories() });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createProduct(data),
    onSuccess: () => { qClient.invalidateQueries({ queryKey: ['products'] }); toast.success('تم إضافة المنتج'); setDialogOpen(false); resetForm(); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateProduct(id, data),
    onSuccess: () => { qClient.invalidateQueries({ queryKey: ['products'] }); toast.success('تم تحديث المنتج'); setDialogOpen(false); resetForm(); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteProduct(id),
    onSuccess: () => { qClient.invalidateQueries({ queryKey: ['products'] }); toast.success('تم حذف المنتج'); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => setForm({ name: '', sku: '', price: '', cost: '', categoryId: '', active: true });

  const openCreate = () => { resetForm(); setEditingProduct(null); setDialogOpen(true); };
  const openEdit = (p: any) => {
    setEditingProduct(p);
    setForm({ name: p.name || '', sku: p.sku || '', price: String(p.price || ''), cost: String(p.cost || ''), categoryId: p.categoryId || '', active: p.active !== false });
    setDialogOpen(true);
  };
  const handleSubmit = () => {
    if (!form.name || !form.price) { toast.error('يرجى تعبئة الحقول المطلوبة'); return; }
    const data = { ...form, price: parseFloat(form.price), cost: form.cost ? parseFloat(form.cost) : null };
    if (editingProduct) updateMutation.mutate({ id: editingProduct.id, data });
    else createMutation.mutate(data);
  };

  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p: any) => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
    }
    return list;
  }, [products, search]);

  return (
    <AnimatedPage className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">المنتجات</h1>
        <div className="flex gap-2 items-center">
          <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="w-48 h-9" />
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل التصنيفات</SelectItem>
              {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} className="bg-amber-600 hover:bg-amber-700"><Plus className="w-4 h-4 ml-1" /> إضافة</Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">لا توجد منتجات</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>السعر</TableHead>
                  <TableHead>التكلفة</TableHead>
                  <TableHead>التصنيف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <span>{getCategoryEmoji(p.categoryName, p.categoryIcon)}</span> {p.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.sku || '-'}</TableCell>
                    <TableCell className="font-bold text-amber-700">{fmt(p.price)}</TableCell>
                    <TableCell>{p.cost ? fmt(p.cost) : '-'}</TableCell>
                    <TableCell>{p.categoryName || '-'}</TableCell>
                    <TableCell><StatusBadge status={p.active !== false ? 'active' : 'inactive'} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}><Edit className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => setDeleteId(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'تعديل منتج' : 'إضافة منتج جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>الاسم *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>SKU</Label><Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} dir="ltr" /></div>
              <div><Label>السعر *</Label><Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} dir="ltr" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>التكلفة</Label><Input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} dir="ltr" /></div>
              <div>
                <Label>التصنيف</Label>
                <Select value={form.categoryId} onValueChange={v => setForm({ ...form, categoryId: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر تصنيف" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="bg-amber-600 hover:bg-amber-700">
              {createMutation.isPending || updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-red-600 hover:bg-red-700">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AnimatedPage>
  );
}

// ═══════════════════════════════════════════════════════
// CATEGORIES MANAGEMENT VIEW
// ═══════════════════════════════════════════════════════
function CategoriesView() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', icon: '', description: '' });
  const qClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => api.getProducts() });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createCategory(data),
    onSuccess: () => { qClient.invalidateQueries({ queryKey: ['categories'] }); toast.success('تم إضافة التصنيف'); setDialogOpen(false); resetForm(); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateCategory(id, data),
    onSuccess: () => { qClient.invalidateQueries({ queryKey: ['categories'] }); toast.success('تم تحديث التصنيف'); setDialogOpen(false); resetForm(); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCategory(id),
    onSuccess: () => { qClient.invalidateQueries({ queryKey: ['categories'] }); toast.success('تم حذف التصنيف'); setDeleteId(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => setForm({ name: '', icon: '', description: '' });
  const openCreate = () => { resetForm(); setEditingCat(null); setDialogOpen(true); };
  const openEdit = (c: any) => {
    setEditingCat(c);
    setForm({ name: c.name || '', icon: c.icon || '', description: c.description || '' });
    setDialogOpen(true);
  };
  const handleSubmit = () => {
    if (!form.name) { toast.error('يرجى إدخال اسم التصنيف'); return; }
    if (editingCat) updateMutation.mutate({ id: editingCat.id, data: form });
    else createMutation.mutate(form);
  };

  const getProductCount = (catId: string) => (products || []).filter((p: any) => p.categoryId === catId).length;

  const emojiOptions = Object.entries(CATEGORY_EMOJIS).slice(0, 24).map(([k, v]) => ({ key: k, emoji: v }));

  return (
    <AnimatedPage className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">التصنيفات</h1>
        <Button onClick={openCreate} className="bg-amber-600 hover:bg-amber-700"><Plus className="w-4 h-4 ml-1" /> إضافة تصنيف</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
      ) : categories.length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">لا توجد تصنيفات</CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat: any) => (
            <Card key={cat.id} className="border-0 shadow-sm hover:shadow-md transition-shadow group">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <span className="text-3xl">{getCategoryEmoji(cat.name, cat.icon)}</span>
                <h3 className="font-bold">{cat.name}</h3>
                <p className="text-xs text-muted-foreground">{getProductCount(cat.id)} منتج</p>
                {cat.description && <p className="text-xs text-muted-foreground line-clamp-2">{cat.description}</p>}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(cat)}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setDeleteId(cat.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editingCat ? 'تعديل تصنيف' : 'إضافة تصنيف جديد'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>الاسم *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>الوصف</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <Label>الأيقونة</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {emojiOptions.map(opt => (
                  <button
                    key={opt.key} type="button"
                    onClick={() => setForm({ ...form, icon: opt.key })}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${form.icon === opt.key ? 'bg-amber-100 ring-2 ring-amber-500 scale-110' : 'bg-gray-50 hover:bg-gray-100'}`}
                  >
                    {opt.emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="bg-amber-600 hover:bg-amber-700">
              {createMutation.isPending || updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا التصنيف؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-red-600 hover:bg-red-700">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AnimatedPage>
  );
}

// ═══════════════════════════════════════════════════════
// BRANCHES MANAGEMENT VIEW
// ═══════════════════════════════════════════════════════
function BranchesView() {
  const user = useAppStore(s => s.user);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '' });
  const qClient = useQueryClient();

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.getBranches(),
  });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => api.getUsers(), enabled: isOwner(user?.role) });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createBranch(data),
    onSuccess: () => { qClient.invalidateQueries({ queryKey: ['branches'] }); toast.success('تم إضافة الفرع'); setDialogOpen(false); resetForm(); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateBranch(id, data),
    onSuccess: () => { qClient.invalidateQueries({ queryKey: ['branches'] }); toast.success('تم تحديث الفرع'); setDialogOpen(false); resetForm(); },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => setForm({ name: '', address: '', phone: '' });
  const openCreate = () => { resetForm(); setEditing(null); setDialogOpen(true); };
  const openEdit = (b: any) => {
    setEditing(b);
    setForm({ name: b.name || '', address: b.address || '', phone: b.phone || '' });
    setDialogOpen(true);
  };
  const handleSubmit = () => {
    if (!form.name) { toast.error('يرجى إدخال اسم الفرع'); return; }
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const getUserCount = (branchId: string) => (users || []).filter((u: any) => u.branchId === branchId).length;

  if (!isOwner(user?.role)) {
    return (
      <AnimatedPage className="flex items-center justify-center h-96">
        <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center"><Shield className="w-10 h-10 mx-auto mb-2 text-muted-foreground" /><p className="text-muted-foreground">هذه الصفحة متاحة فقط للمالك</p></CardContent></Card>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">الفروع</h1>
        <Button onClick={openCreate} className="bg-amber-600 hover:bg-amber-700"><Plus className="w-4 h-4 ml-1" /> إضافة فرع</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      ) : branches.length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">لا توجد فروع</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch: any) => (
            <Card key={branch.id} className="border-0 shadow-sm hover:shadow-md transition-shadow group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-100 p-2.5 rounded-xl"><Building2 className="w-5 h-5 text-amber-600" /></div>
                    <div>
                      <h3 className="font-bold">{branch.name}</h3>
                      <Badge variant="outline" className="text-[10px] mt-1"><Users className="w-3 h-3 ml-1" />{getUserCount(branch.id)} مستخدم</Badge>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEdit(branch)}>
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {branch.address && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{branch.address}</div>}
                  {branch.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /><span dir="ltr">{branch.phone}</span></div>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editing ? 'تعديل فرع' : 'إضافة فرع جديد'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>اسم الفرع *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>العنوان</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>الهاتف</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} dir="ltr" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="bg-amber-600 hover:bg-amber-700">
              {createMutation.isPending || updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AnimatedPage>
  );
}

// ═══════════════════════════════════════════════════════
// USERS MANAGEMENT VIEW
// ═══════════════════════════════════════════════════════
function UsersView() {
  const currentUser = useAppStore(s => s.user);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'cashier', branchId: '' });
  const qClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
  });
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: () => api.getBranches() });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createUser(data),
    onSuccess: () => { qClient.invalidateQueries({ queryKey: ['users'] }); toast.success('تم إضافة المستخدم'); setDialogOpen(false); resetForm(); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateUser(id, data),
    onSuccess: () => { qClient.invalidateQueries({ queryKey: ['users'] }); toast.success('تم تحديث المستخدم'); setDialogOpen(false); resetForm(); },
    onError: (e: any) => toast.error(e.message),
  });
  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.toggleUserStatus(id),
    onSuccess: () => { qClient.invalidateQueries({ queryKey: ['users'] }); toast.success('تم تغيير الحالة'); },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => setForm({ name: '', email: '', password: '', role: 'cashier', branchId: '' });
  const openCreate = () => { resetForm(); setEditingUser(null); setDialogOpen(true); };
  const openEdit = (u: any) => {
    setEditingUser(u);
    setForm({ name: u.name || '', email: u.email || '', password: '', role: u.role || 'cashier', branchId: u.branchId || '' });
    setDialogOpen(true);
  };
  const handleSubmit = () => {
    if (!form.name || !form.email) { toast.error('يرجى تعبئة الحقول المطلوبة'); return; }
    const data: any = { name: form.name, email: form.email, role: form.role, branchId: form.branchId };
    if (form.password) data.password = form.password;
    if (editingUser) updateMutation.mutate({ id: editingUser.id, data });
    else { if (!form.password) { toast.error('يرجى إدخال كلمة المرور'); return; } createMutation.mutate(data); }
  };

  const getBranchName = (branchId: string) => (branches || []).find((b: any) => b.id === branchId)?.name || '-';

  if (!isManager(currentUser?.role)) {
    return (
      <AnimatedPage className="flex items-center justify-center h-96">
        <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center"><Shield className="w-10 h-10 mx-auto mb-2 text-muted-foreground" /><p className="text-muted-foreground">هذه الصفحة متاحة فقط للمالك والمدير</p></CardContent></Card>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">المستخدمين</h1>
        <Button onClick={openCreate} className="bg-amber-600 hover:bg-amber-700"><Plus className="w-4 h-4 ml-1" /> إضافة مستخدم</Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>البريد</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>الفرع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="flex items-center gap-2"><UserCircle className="w-4 h-4 text-muted-foreground" />{u.name}</TableCell>
                    <TableCell className="font-mono text-xs" dir="ltr">{u.email}</TableCell>
                    <TableCell><RoleBadge role={u.role} /></TableCell>
                    <TableCell>{getBranchName(u.branchId)}</TableCell>
                    <TableCell><StatusBadge status={u.active !== false ? 'active' : 'inactive'} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(u)}><Edit className="w-3.5 h-3.5" /></Button>
                        {u.id !== currentUser?.id && (
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleMutation.mutate(u.id)}>
                            {u.active !== false ? <XCircle className="w-3.5 h-3.5 text-red-500" /> : <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>الاسم *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>البريد *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} dir="ltr" /></div>
            <div><Label>{editingUser ? 'كلمة المرور (اتركها فارغة لعدم التغيير)' : 'كلمة المرور *'}</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} dir="ltr" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الدور</Label>
                <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">مالك</SelectItem>
                    <SelectItem value="manager">مدير</SelectItem>
                    <SelectItem value="cashier">كاشير</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الفرع</Label>
                <Select value={form.branchId} onValueChange={v => setForm({ ...form, branchId: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر فرع" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="bg-amber-600 hover:bg-amber-700">
              {createMutation.isPending || updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AnimatedPage>
  );
}

// ═══════════════════════════════════════════════════════
// REPORTS VIEW
// ═══════════════════════════════════════════════════════
const COLORS = ['#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#10b981', '#3b82f6', '#8b5cf6'];

function ReportsView() {
  const user = useAppStore(s => s.user);
  const [period, setPeriod] = useState('today');
  const [branchFilter, setBranchFilter] = useState('all');

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['report-summary', period, branchFilter],
    queryFn: () => api.getSummary({ period, ...(branchFilter !== 'all' ? { branchId: branchFilter } : {}) }),
  });
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['report-sales', period],
    queryFn: () => api.getSales({ period: period === 'today' ? 'daily' : period === 'week' ? 'weekly' : 'monthly', days: period === 'today' ? '1' : period === 'week' ? '7' : '30' }),
  });
  const { data: productReport, isLoading: prodLoading } = useQuery({
    queryKey: ['report-products', period],
    queryFn: () => api.getProductReport({ period }),
  });
  const { data: cashierReport, isLoading: cashLoading } = useQuery({
    queryKey: ['report-cashiers', period],
    queryFn: () => api.getCashierReport({ period }),
    enabled: isManager(user?.role),
  });
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.getBranches(),
    enabled: isOwner(user?.role),
  });

  const isLoading = sumLoading || salesLoading || prodLoading || cashLoading;

  return (
    <AnimatedPage className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">المبيعات والتقارير الشاملة</h1>
        <div className="flex gap-2 items-center">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">اليوم</SelectItem>
              <SelectItem value="week">هذا الأسبوع</SelectItem>
              <SelectItem value="month">هذا الشهر</SelectItem>
            </SelectContent>
          </Select>
          {isOwner(user?.role) && (
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-32 h-9"><SelectValue placeholder="كل الفروع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفروع</SelectItem>
                {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'إجمالي المبيعات', value: `${fmt(summary?.totalSales || 0)} ر.س`, color: 'text-emerald-600', icon: <DollarSign className="w-4 h-4 text-emerald-500" /> },
          { title: 'عدد الفواتير', value: String(summary?.invoiceCount || 0), color: 'text-blue-600', icon: <Receipt className="w-4 h-4 text-blue-500" /> },
          { title: 'متوسط الطلب', value: `${fmt(summary?.avgOrder || 0)} ر.س`, color: 'text-purple-600', icon: <TrendingUp className="w-4 h-4 text-purple-500" /> },
          { title: 'صافي الربح', value: `${fmt(summary?.netProfit || 0)} ر.س`, color: 'text-amber-600', icon: <Banknote className="w-4 h-4 text-amber-500" /> },
        ].map(card => (
          <Card key={card.title} className="border-0 shadow-sm relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <div className={`text-xl md:text-2xl font-bold mt-1 ${card.color}`}>{isLoading ? <Skeleton className="h-8 w-24" /> : card.value}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg">{card.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Line Chart */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-amber-600" /> اتجاه المبيعات</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (salesData?.data?.length > 0 ? (
              <div className="h-[250px] w-full mt-4" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesData.data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} dy={10} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} dx={-10} tickFormatter={(val) => `${val}`} />
                    <RechartsTooltip cursor={{ stroke: '#f59e0b', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="totalSales" name="المبيعات (ر.س)" stroke="#d97706" strokeWidth={3} dot={{ r: 4, fill: '#d97706', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
               <div className="h-[250px] flex items-center justify-center text-muted-foreground">لا توجد بيانات للمبيعات المحددة</div>
            ))}
          </CardContent>
        </Card>

        {/* Products Pie Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4 text-amber-600" /> نسبة إيرادات المنتجات</CardTitle></CardHeader>
          <CardContent>
             {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (productReport?.products?.length > 0 ? (
              <div className="h-[250px] w-full mt-4" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={productReport.products.slice(0, 5)} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="revenue" nameKey="name">
                      {productReport.products.slice(0, 5).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => `${fmt(Number(value))} ر.س`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: 'right' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
               <div className="h-[250px] flex items-center justify-center text-muted-foreground">لا توجد منتجات مباعة</div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4 text-amber-600" /> أفضل المنتجات مبيعاً</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المنتج</TableHead>
                  <TableHead>الكمية المباعة</TableHead>
                  <TableHead>الإيرادات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-4"><Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : (productReport?.products || []).slice(0, 7).map((p: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm font-medium">{p.name || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{p.quantitySold || 0}</TableCell>
                    <TableCell className="font-bold text-amber-700">{fmt(p.revenue || 0)} <span className="text-[10px] text-muted-foreground font-normal">ر.س</span></TableCell>
                  </TableRow>
                ))}
                {!isLoading && (productReport?.products?.length === 0) && (
                   <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">لا توجد بيانات</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Cashier Performance - Combined Chart & Table */}
        {isManager(user?.role) && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><UserCircle className="w-4 h-4 text-emerald-600" /> أداء الموظفين</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (cashierReport?.cashiers?.length > 0 ? (
                <div className="h-[200px] w-full mt-2" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashierReport.cashiers.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#374151' }} width={80} axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{fill: '#fef3c7'}} formatter={(value) => `${fmt(Number(value))} ر.س`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: 'right' }} />
                      <Bar dataKey="totalSales" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">لا توجد بيانات للموظفين</div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AnimatedPage>
  );
}

// ═══════════════════════════════════════════════════════
// SALES ANALYTICS VIEW
// ═══════════════════════════════════════════════════════
function SalesAnalyticsView() {
  const user = useAppStore(s => s.user);
  const [dateRange, setDateRange] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [cashierFilter, setCashierFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const effectiveFrom = useMemo(() => {
    if (dateRange === 'custom') return customFrom ? new Date(customFrom).toISOString() : undefined;
    const d = new Date();
    d.setHours(0,0,0,0);
    if (dateRange === 'today') return d.toISOString();
    if (dateRange === 'week') { d.setDate(d.getDate() - d.getDay()); return d.toISOString(); }
    if (dateRange === 'month') { d.setDate(1); return d.toISOString(); }
    if (dateRange === 'year') { d.setMonth(0, 1); return d.toISOString(); }
    return undefined;
  }, [dateRange, customFrom]);

  const effectiveTo = useMemo(() => {
    if (dateRange === 'custom') return customTo ? (new Date(new Date(customTo).setHours(23,59,59,999))).toISOString() : undefined;
    const d = new Date();
    d.setHours(23,59,59,999);
    return d.toISOString();
  }, [dateRange, customTo]);

  const { data: invoicesRes, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices-analytic', effectiveFrom, effectiveTo],
    queryFn: () => api.getInvoices({ 
      from: effectiveFrom || '', 
      to: effectiveTo || '', 
      limit: '1000',
      status: 'paid' 
    }),
  });

  const { data: usersData = [] } = useQuery({ queryKey: ['users'], queryFn: () => api.getUsers(), enabled: isManager(user?.role) });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => api.getCategories() });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => api.getProducts() });

  const invoices = invoicesRes?.data || [];

  const prodMap = useMemo(() => {
    const map = new Map<string, any>();
    products.forEach((p:any) => map.set(p.id, p));
    return map;
  }, [products]);

  const aggregated = useMemo(() => {
    let salesLimit = 0;
    let items: any[] = [];
    
    invoices.forEach((inv: any) => {
      if (cashierFilter !== 'all' && inv.userId !== cashierFilter) return;

      (inv.items || []).forEach((item: any) => {
        const prod = item.productId ? prodMap.get(item.productId) : null;
        const catId = prod ? prod.categoryId : 'unknown';
        const catName = prod ? categories.find((c:any) => c.id === catId)?.name || 'بدون تصنيف' : 'بدون تصنيف';

        if (categoryFilter !== 'all' && catId !== categoryFilter) return;

        items.push({
          ...item,
          catId,
          catName,
          cashierId: inv.userId,
          cashierName: inv.user?.name || 'مجهول',
          date: inv.createdAt,
          invoiceId: inv.invoiceNo,
        });
        salesLimit += item.total;
      });
    });

    const byProduct: Record<string, any> = {};
    const byCategory: Record<string, any> = {};
    const byCashier: Record<string, any> = {};

    items.forEach(it => {
      if(!byProduct[it.name]) byProduct[it.name] = { name: it.name, qty: 0, rev: 0 };
      byProduct[it.name].qty += it.quantity;
      byProduct[it.name].rev += it.total;

      if(!byCategory[it.catName]) byCategory[it.catName] = { name: it.catName, qty: 0, rev: 0 };
      byCategory[it.catName].qty += it.quantity;
      byCategory[it.catName].rev += it.total;

      if(!byCashier[it.cashierName]) byCashier[it.cashierName] = { name: it.cashierName, qty: 0, rev: 0 };
      byCashier[it.cashierName].qty += it.quantity;
      byCashier[it.cashierName].rev += it.total;
    });

    const topProducts = Object.values(byProduct).sort((a,b) => b.rev - a.rev);
    const catSales = Object.values(byCategory).sort((a,b) => b.rev - a.rev);
    const cashierSales = Object.values(byCashier).sort((a,b) => b.rev - a.rev);

    items.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { items, totalRevenue: salesLimit, topProducts, catSales, cashierSales };
  }, [invoices, cashierFilter, categoryFilter, prodMap, categories]);

  return (
    <AnimatedPage className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">المبيعات التفصيلية</h1>
      </div>

      <Card className="border-0 shadow-sm bg-gray-50/50">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">الفترة الزمنية</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="week">هذا الأسبوع</SelectItem>
                <SelectItem value="month">هذا الشهر</SelectItem>
                <SelectItem value="year">هذه السنة</SelectItem>
                <SelectItem value="custom">مخصص...</SelectItem>
              </SelectContent>
            </Select>
            {dateRange === 'custom' && (
              <div className="flex gap-2 mt-2">
                <Input type="date" className="h-8 text-xs bg-white" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} />
                <Input type="date" className="h-8 text-xs bg-white" value={customTo} onChange={e=>setCustomTo(e.target.value)} />
              </div>
            )}
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs">التصنيف</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل التصنيفات</SelectItem>
                {categories.map((c:any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">الكاشير</Label>
            <Select value={cashierFilter} onValueChange={setCashierFilter} disabled={!isManager(user?.role)}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="كل الموظفين" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الموظفين</SelectItem>
                {usersData.map((u:any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 flex flex-col justify-end">
             <div className="px-3 py-2 bg-amber-100/50 border border-amber-200 rounded-lg text-center flex-1 flex flex-col justify-center">
                 <p className="text-[10px] text-amber-800 font-bold mb-1">الإيراد المصفى (ر.س)</p>
                 <p className="text-lg font-black text-amber-900">{fmt(aggregated.totalRevenue)}</p>
             </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FolderOpen className="w-4 h-4 text-emerald-600"/> مبيعات التصنيفات</CardTitle></CardHeader>
          <CardContent className="p-0">
             <ScrollArea className="h-[200px]">
               <Table>
                 <TableHeader><TableRow><TableHead>التصنيف</TableHead><TableHead>إيراد</TableHead></TableRow></TableHeader>
                 <TableBody>
                   {aggregated.catSales.map((c:any, i:number) => (
                     <TableRow key={i}><TableCell className="text-xs py-2">{c.name}</TableCell><TableCell className="text-xs font-bold text-emerald-700 py-2" dir="ltr">{fmt(c.rev)}</TableCell></TableRow>
                   ))}
                   {aggregated.catSales.length === 0 && <TableRow><TableCell colSpan={2} className="text-center py-4 text-xs text-muted-foreground">لا يوجد</TableCell></TableRow>}
                 </TableBody>
               </Table>
             </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Package className="w-4 h-4 text-blue-600"/> أكثر المنتجات مبيعاً</CardTitle></CardHeader>
          <CardContent className="p-0">
             <ScrollArea className="h-[200px]">
               <Table>
                 <TableHeader><TableRow><TableHead>المنتج</TableHead><TableHead>إيراد</TableHead></TableRow></TableHeader>
                 <TableBody>
                   {aggregated.topProducts.map((p:any, i:number) => (
                     <TableRow key={i}><TableCell className="text-xs py-2 truncate max-w-[120px]">{p.name} <span className="text-[10px] text-muted-foreground ml-1">x{p.qty}</span></TableCell><TableCell className="text-xs font-bold text-blue-700 py-2" dir="ltr">{fmt(p.rev)}</TableCell></TableRow>
                   ))}
                   {aggregated.topProducts.length === 0 && <TableRow><TableCell colSpan={2} className="text-center py-4 text-xs text-muted-foreground">لا يوجد</TableCell></TableRow>}
                 </TableBody>
               </Table>
             </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><UserCircle className="w-4 h-4 text-purple-600"/> مبيعات الموظفين</CardTitle></CardHeader>
          <CardContent className="p-0">
             <ScrollArea className="h-[200px]">
               <Table>
                 <TableHeader><TableRow><TableHead>الكاشير</TableHead><TableHead>إيراد</TableHead></TableRow></TableHeader>
                 <TableBody>
                   {aggregated.cashierSales.map((c:any, i:number) => (
                     <TableRow key={i}><TableCell className="text-xs py-2">{c.name}</TableCell><TableCell className="text-xs font-bold text-purple-700 py-2" dir="ltr">{fmt(c.rev)}</TableCell></TableRow>
                   ))}
                   {aggregated.cashierSales.length === 0 && <TableRow><TableCell colSpan={2} className="text-center py-4 text-xs text-muted-foreground">لا يوجد</TableCell></TableRow>}
                 </TableBody>
               </Table>
             </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
           <div className="flex justify-between items-center">
             <CardTitle className="text-sm">سجل المبيعات التفصيلي</CardTitle>
             <Badge variant="secondary">{aggregated.items.length} منتج مباع</Badge>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ والوقت</TableHead>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>المنتج</TableHead>
                <TableHead>التصنيف</TableHead>
                <TableHead>الكاشير</TableHead>
                <TableHead>الكمية</TableHead>
                <TableHead>الإجمالي</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoicesLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-6"><Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
              ) : aggregated.items.slice(0, 100).map((it:any, i:number) => {
                const dateObj = new Date(it.date);
                const isToday = dateObj.toDateString() === new Date().toDateString();
                const dStr = isToday ? dateObj.toLocaleTimeString('ar-SA', { hour: '2-digit', minute:'2-digit' }) : dateObj.toLocaleString('ar-SA', { dateStyle:'short', timeStyle: 'short' });
                return (
                 <TableRow key={i}>
                  <TableCell className="text-xs font-mono text-muted-foreground" dir="ltr">{dStr}</TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">{it.invoiceId}</TableCell>
                  <TableCell className="text-sm font-medium">{it.name}</TableCell>
                  <TableCell className="text-xs">{it.catName}</TableCell>
                  <TableCell className="text-[11px]">{it.cashierName}</TableCell>
                  <TableCell className="font-mono text-xs">{it.quantity}</TableCell>
                  <TableCell className="font-bold text-amber-700">{fmt(it.total)}</TableCell>
                 </TableRow>
                )
              })}
              {aggregated.items.length === 0 && !invoicesLoading && (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">لا توجد مبيعات متطابقة مع التصفية</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          {aggregated.items.length > 100 && (
             <div className="p-3 text-center text-[10px] text-muted-foreground border-t bg-gray-50">يتم عرض أحدث 100 سجل فقط لتسريع التصفح. إجماليات الرسوم البيانية والجداول أعلاه محسوبة لكل السجلات المطابقة للتصفية.</div>
          )}
        </CardContent>
      </Card>
    </AnimatedPage>
  );
}

// ═══════════════════════════════════════════════════════
// AUDIT LOGS VIEW
// ═══════════════════════════════════════════════════════
function AuditLogsView() {
  const currentUser = useAppStore(s => s.user);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('all');

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['audit-logs', page, actionFilter],
    queryFn: () => api.getAuditLogs({
      page: String(page), limit: '20',
      ...(actionFilter !== 'all' ? { action: actionFilter } : {}),
    }),
  });

  const logs = logsData?.data || logsData || [];

  if (!isManager(currentUser?.role)) {
    return (
      <AnimatedPage className="flex items-center justify-center h-96">
        <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center"><Shield className="w-10 h-10 mx-auto mb-2 text-muted-foreground" /><p className="text-muted-foreground">هذه الصفحة متاحة فقط للمالك والمدير</p></CardContent></Card>
      </AnimatedPage>
    );
  }

  const actionLabels: Record<string, string> = {
    create: 'إنشاء', update: 'تحديث', delete: 'حذف', login: 'تسجيل دخول', logout: 'تسجيل خروج', pay: 'دفع',
  };

  return (
    <AnimatedPage className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">سجل العمليات</h1>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل العمليات</SelectItem>
            <SelectItem value="create">إنشاء</SelectItem>
            <SelectItem value="update">تحديث</SelectItem>
            <SelectItem value="delete">حذف</SelectItem>
            <SelectItem value="pay">دفع</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">لا توجد سجلات</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>الإجراء</TableHead>
                  <TableHead>الكيان</TableHead>
                  <TableHead>التفاصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{new Date(log.createdAt).toLocaleString('ar-SA')}</TableCell>
                    <TableCell className="text-sm">{log.userName || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        log.action === 'delete' ? 'bg-red-50 text-red-600 border-red-200' :
                        log.action === 'create' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                        log.action === 'pay' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                        'bg-blue-50 text-blue-600 border-blue-200'
                      }>
                        {actionLabels[log.action] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.entity || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{log.details || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>السابق</Button>
        <span className="flex items-center text-sm text-muted-foreground">صفحة {page}</span>
        <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={logs.length < 20}>التالي</Button>
      </div>
    </AnimatedPage>
  );
}

// ═══════════════════════════════════════════════════════
// RECEIPT PREVIEW COMPONENT
// ═══════════════════════════════════════════════════════
function ReceiptPreview({ settings, primaryColor }: { settings: any; primaryColor: string }) {
  const now = new Date();
  const invNo = `INV-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-0001`;
  const sym = settings?.currencySymbol || 'ر.س';
  const items = [
    { name: 'كابتشينو', qty: 2, price: 20 },
    { name: 'كيك شوكولاتة', qty: 1, price: 25 },
  ];
  const sub = items.reduce((s: number, i: any) => s + i.qty * i.price, 0);
  const tax = Math.round(sub * (settings?.taxRate || 15) / 100 * 100) / 100;
  const total = sub + tax;
  const alignClass = settings?.receiptAlign === 'left' ? 'text-left' : settings?.receiptAlign === 'right' ? 'text-right' : 'text-center';
  const paperWidth = settings?.receiptPaper === 'a4' ? '100%' : settings?.receiptPaper === 'thermal-58' ? '220px' : '300px';
  const templateClass = settings?.receiptTemplate === 'modern' ? 'border border-slate-200 rounded-2xl' : settings?.receiptTemplate === 'formal' ? 'border border-gray-300' : '';

  return (
    <div className={`bg-white rounded-xl shadow-lg p-4 mx-auto ${templateClass}`} style={{ maxWidth: paperWidth, fontFamily: 'monospace', fontSize: `${settings?.receiptFontSize || 11}px`, lineHeight: '1.5' }}>
      {/* Header */}
      <div className={`${alignClass} mb-3`}>
        {settings?.receiptShowLogo !== false && settings?.logo && (
          <div className="w-12 h-12 mx-auto mb-2 rounded-lg overflow-hidden bg-gray-100">
            <img src={settings.logo} alt="logo" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="font-bold text-sm" style={{ color: primaryColor }}>{settings?.name || 'اسم المتجر'}</div>
        {settings?.phone && <div className="text-gray-500">{settings.phone}</div>}
        {settings?.address && <div className="text-gray-500 text-[10px]">{settings.address}</div>}
        {settings?.taxNumber && <div className="text-gray-400 text-[10px]">ض.ر: {settings.taxNumber}</div>}
      </div>

      {/* Custom header */}
      {settings?.receiptHeader && (
        <div className="text-center text-[10px] italic text-gray-500 mb-2 pb-2 border-b border-dashed border-gray-200">
          {settings.receiptHeader}
        </div>
      )}

      {/* Invoice info */}
      <div className="flex justify-between text-[10px] text-gray-500 mb-2 pb-2 border-b border-dashed border-gray-200">
        <span>{invNo}</span>
        <span>{now.toLocaleDateString('ar-SA')}</span>
        <span>{now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      {/* Items */}
      <div className="space-y-1 mb-2">
        {items.map((item: any, i: number) => (
          <div key={i} className="flex justify-between">
            <div>
              <span>{item.name}</span>
              <span className="text-gray-400"> ×{item.qty}</span>
            </div>
            <span className="font-bold">{(item.qty * item.price).toFixed(2)} {sym}</span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-t border-dashed border-gray-200 pt-2 space-y-1">
        <div className="flex justify-between text-gray-500">
          <span>المجموع الفرعي</span><span>{sub.toFixed(2)} {sym}</span>
        </div>
        {settings?.showTaxOnReceipt !== false && (
          <div className="flex justify-between text-gray-500">
            <span>الضريبة ({settings?.taxRate || 15}%)</span><span>{tax.toFixed(2)} {sym}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm" style={{ color: primaryColor }}>
          <span>الإجمالي</span><span>{total.toFixed(2)} {sym}</span>
        </div>
      </div>

      {/* Footer */}
      <div className={`${alignClass} mt-3 pt-2 border-t border-dashed border-gray-200`}>
        <div className="text-[10px] text-gray-400">تم الدفع: نقداً</div>
        {settings?.showQrOnReceipt && (
          <div className="inline-flex mt-2 p-1 bg-white border rounded">
            <QrCode className="w-10 h-10 text-gray-700" />
          </div>
        )}
        {settings?.receiptFooter && (
          <div className="text-[10px] italic text-gray-500 mt-1">{settings.receiptFooter}</div>
        )}
        <div className="text-[9px] text-gray-300 mt-1">شكراً لزيارتكم 🤍</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SETTINGS VIEW
// ═══════════════════════════════════════════════════════
function SettingsView() {
  const { user, company, setAuth } = useAppStore();
  const [activeTab, setActiveTab] = useState('store');
  const qClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
  });

  // Form states
  const [storeName, setStoreName] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [taxRate, setTaxRate] = useState('15');
  const [currency, setCurrency] = useState('SAR');
  const [currencySymbol, setCurrencySymbol] = useState('ر.س');
  const [taxNumber, setTaxNumber] = useState('');

  // Theme
  const [primaryColor, setPrimaryColor] = useState('#d97706');
  const [secondaryColor, setSecondaryColor] = useState('#78350f');
  const [accentColor, setAccentColor] = useState('#fbbf24');

  // Receipt
  const [receiptHeader, setReceiptHeader] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [receiptShowLogo, setReceiptShowLogo] = useState(true);
  const [receiptWidth, setReceiptWidth] = useState('80');
  const [showTaxOnReceipt, setShowTaxOnReceipt] = useState(true);
  const [showDiscountOnReceipt, setShowDiscountOnReceipt] = useState(true);
  const [showQrOnReceipt, setShowQrOnReceipt] = useState(false);
  const [receiptFontSize, setReceiptFontSize] = useState(11);
  const [receiptAlign, setReceiptAlign] = useState<'left' | 'center' | 'right'>('center');
  const [receiptPaper, setReceiptPaper] = useState<'thermal-58' | 'thermal-80' | 'a4'>('thermal-80');
  const [receiptTemplate, setReceiptTemplate] = useState<'simple' | 'formal' | 'modern'>('simple');
  const [receiptTemplates, setReceiptTemplates] = useState<any[]>([]);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync settings when loaded
  useEffect(() => {
    if (settings) {
      setStoreName(settings.name || '');
      setStorePhone(settings.phone || '');
      setStoreEmail(settings.email || '');
      setStoreAddress(settings.address || '');
      setTaxRate(String(settings.taxRate || 15));
      setCurrency(settings.currency || 'SAR');
      setCurrencySymbol(settings.currencySymbol || 'ر.س');
      setTaxNumber(settings.taxNumber || '');
      setPrimaryColor(settings.primaryColor || '#d97706');
      setSecondaryColor(settings.secondaryColor || '#78350f');
      setAccentColor(settings.accentColor || '#fbbf24');
      setReceiptHeader(settings.receiptHeader || '');
      setReceiptFooter(settings.receiptFooter || '');
      setReceiptShowLogo(settings.receiptShowLogo !== false);
      setReceiptWidth(settings.receiptWidth || '80');
      setShowTaxOnReceipt(settings.showTaxOnReceipt !== false);
      setShowDiscountOnReceipt(settings.showDiscountOnReceipt !== false);
      setShowQrOnReceipt(settings.showQrOnReceipt === true);
      setReceiptFontSize(settings.receiptFontSize || 11);
      setReceiptAlign((settings.receiptAlign || 'center') as 'left' | 'center' | 'right');
      setReceiptPaper((settings.receiptPaper || 'thermal-80') as 'thermal-58' | 'thermal-80' | 'a4');
      setReceiptTemplate((settings.receiptTemplate || 'simple') as 'simple' | 'formal' | 'modern');
      setReceiptTemplates(Array.isArray(settings.receiptTemplates) ? settings.receiptTemplates : []);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.updateSettings(data),
    onSuccess: (updatedCompany) => {
      toast.success('تم حفظ الإعدادات بنجاح');
      qClient.invalidateQueries({ queryKey: ['settings'] });
      // Update local auth state
      if (user && company) {
        setAuth(user, useAppStore.getState().token, {
          ...company,
          ...updatedCompany,
        }, useAppStore.getState().branch);
      }
    },
    onError: (err: any) => toast.error(err.message || 'فشل حفظ الإعدادات'),
  });

  const clearSalesMutation = useMutation({
    mutationFn: () => api.clearSales(),
    onSuccess: () => {
      toast.success('تم حذف جميع المبيعات بنجاح');
      qClient.invalidateQueries({ queryKey: ['invoices'] });
      qClient.invalidateQueries({ queryKey: ['report-summary'] });
      qClient.invalidateQueries({ queryKey: ['report-sales'] });
      qClient.invalidateQueries({ queryKey: ['report-products'] });
      qClient.invalidateQueries({ queryKey: ['report-cashiers'] });
    },
    onError: (err: any) => toast.error(err.message || 'فشل حذف المبيعات'),
  });

  const handleSaveStore = () => {
    updateMutation.mutate({
      name: storeName,
      phone: storePhone,
      email: storeEmail,
      address: storeAddress,
      taxRate: parseFloat(taxRate) || 15,
      currency,
      currencySymbol,
      taxNumber,
    });
  };

  const handleSaveTheme = () => {
    updateMutation.mutate({
      primaryColor,
      secondaryColor,
      accentColor,
    });
  };

  const handleSaveReceipt = () => {
    updateMutation.mutate({
      receiptHeader,
      receiptFooter,
      receiptShowLogo,
      receiptWidth,
      showTaxOnReceipt,
      showDiscountOnReceipt,
      showQrOnReceipt,
      receiptFontSize,
      receiptAlign,
      receiptPaper,
      receiptTemplate,
      receiptTemplates,
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الملف يتجاوز 2MB');
      return;
    }

    setUploading(true);
    try {
      const res = await api.uploadLogo(file);
      updateMutation.mutate({ logo: res.url });
      toast.success('تم رفع الشعار بنجاح');
    } catch (err: any) {
      toast.error(err.message || 'فشل رفع الشعار');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Preview settings
  const previewSettings = {
    name: storeName,
    phone: storePhone,
    email: storeEmail,
    address: storeAddress,
    logo: settings?.logo || company?.logo,
    taxRate: parseFloat(taxRate),
    taxNumber,
    currencySymbol,
    receiptHeader,
    receiptFooter,
    receiptShowLogo,
    receiptWidth,
    showTaxOnReceipt,
    showDiscountOnReceipt,
    showQrOnReceipt,
    receiptFontSize,
    receiptAlign,
    receiptPaper,
    receiptTemplate,
  };

  const presetThemes = [
    { name: 'عنبري', primary: '#d97706', secondary: '#78350f', accent: '#fbbf24', bg: 'bg-amber-100' },
    { name: 'أخضر زمردي', primary: '#059669', secondary: '#064e3b', accent: '#34d399', bg: 'bg-emerald-100' },
    { name: 'أزرق سماوي', primary: '#0284c7', secondary: '#0c4a6e', accent: '#38bdf8', bg: 'bg-sky-100' },
    { name: 'بنفسجي', primary: '#7c3aed', secondary: '#3b0764', accent: '#a78bfa', bg: 'bg-violet-100' },
    { name: 'وردي', primary: '#db2777', secondary: '#500724', accent: '#f472b6', bg: 'bg-pink-100' },
    { name: 'أحمر ناري', primary: '#dc2626', secondary: '#450a0a', accent: '#f87171', bg: 'bg-red-100' },
  ];
  const templatePresets = [
    { id: 'simple', name: 'بسيط' },
    { id: 'formal', name: 'رسمي' },
    { id: 'modern', name: 'حديث' },
  ];

  const saveCurrentTemplate = () => {
    const key = `tpl-${Date.now()}`;
    const next = [
      ...receiptTemplates,
      { key, name: `قالب ${receiptTemplates.length + 1}`, receiptTemplate, receiptPaper, receiptAlign, receiptFontSize, showTaxOnReceipt, showDiscountOnReceipt, showQrOnReceipt, receiptShowLogo, receiptHeader, receiptFooter },
    ];
    setReceiptTemplates(next);
    toast.success('تم حفظ القالب');
  };

  if (user?.role !== 'owner') {
    return (
      <AnimatedPage className="flex items-center justify-center h-96">
        <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center"><Shield className="w-10 h-10 mx-auto mb-2 text-muted-foreground" /><p className="text-muted-foreground">هذه الصفحة متاحة فقط للمالك</p></CardContent></Card>
      </AnimatedPage>
    );
  }

  const tabs = [
    { id: 'store', label: 'المتجر', icon: Store },
    { id: 'theme', label: 'المظهر والألوان', icon: Palette },
    { id: 'receipt', label: 'الفاتورة', icon: FileSignature },
    { id: 'general', label: 'عام', icon: Settings },
  ];

  return (
    <AnimatedPage className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">الإعدادات</h1>
            <p className="text-xs text-muted-foreground">تخصيص النظام حسب احتياجات متجرك</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-[500px] w-full rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* ─── STORE TAB ─── */}
            {activeTab === 'store' && (
              <>
                <Card className="border-0 shadow-sm overflow-hidden">
                  <CardHeader className="bg-gradient-to-l from-amber-50 to-white pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                        <Store className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">معلومات المتجر</CardTitle>
                        <CardDescription className="text-xs">البيانات الأساسية لمتجرك</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-5">
                    {/* Logo Upload */}
                    <div className="flex items-center gap-6">
                      <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 border-2 border-dashed border-amber-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-amber-400 group-hover:shadow-md">
                          {settings?.logo ? (
                            <img src={settings.logo} alt="logo" className="w-full h-full object-cover" />
                          ) : (
                            <Upload className="w-6 h-6 text-amber-400" />
                          )}
                        </div>
                        <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Edit className="w-5 h-5 text-white" />
                        </div>
                        {uploading && (
                          <div className="absolute inset-0 rounded-2xl bg-white/80 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                          </div>
                        )}
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">شعار المتجر</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG — حد أقصى 2MB</p>
                        {settings?.logo && (
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 mt-2 h-7 text-xs" onClick={() => updateMutation.mutate({ logo: null })}>
                            <Trash2 className="w-3 h-3 ml-1" /> إزالة الشعار
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>اسم المتجر</Label>
                        <Input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="مقهى الأرواح" className="h-10" />
                      </div>
                      <div className="space-y-2">
                        <Label>رقم الهاتف</Label>
                        <Input value={storePhone} onChange={e => setStorePhone(e.target.value)} placeholder="+966XXXXXXXXX" dir="ltr" className="h-10 text-left" />
                      </div>
                      <div className="space-y-2">
                        <Label>البريد الإلكتروني</Label>
                        <Input value={storeEmail} onChange={e => setStoreEmail(e.target.value)} placeholder="info@example.com" dir="ltr" type="email" className="h-10 text-left" />
                      </div>
                      <div className="space-y-2">
                        <Label>الرقم الضريبي</Label>
                        <Input value={taxNumber} onChange={e => setTaxNumber(e.target.value)} placeholder="300000000000003" dir="ltr" className="h-10 text-left" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>العنوان</Label>
                      <Textarea value={storeAddress} onChange={e => setStoreAddress(e.target.value)} placeholder="الرياض، حي الملقا" className="min-h-[60px] resize-none" />
                    </div>
                  </CardContent>
                  <CardFooter className="border-t bg-muted/30 px-6 py-3">
                    <Button onClick={handleSaveStore} disabled={updateMutation.isPending} className="bg-gradient-to-l from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md">
                      {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 ml-1" />}
                      حفظ التغييرات
                    </Button>
                  </CardFooter>
                </Card>
              </>
            )}

            {/* ─── THEME TAB ─── */}
            {activeTab === 'theme' && (
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-l from-violet-50 to-white pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                      <Palette className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">المظهر والألوان</CardTitle>
                      <CardDescription className="text-xs">اختر الألوان التي تناسب علامتك التجارية</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Preset Themes */}
                  <div>
                    <p className="text-sm font-medium mb-3">سمات جاهزة</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {presetThemes.map((theme) => (
                        <button
                          key={theme.name}
                          onClick={() => {
                            setPrimaryColor(theme.primary);
                            setSecondaryColor(theme.secondary);
                            setAccentColor(theme.accent);
                          }}
                          className={`relative p-3 rounded-xl border-2 transition-all hover:shadow-md ${
                            primaryColor === theme.primary ? 'border-current shadow-md scale-[1.02]' : 'border-transparent'
                          }`}
                          style={{ borderColor: primaryColor === theme.primary ? theme.primary : undefined }}
                        >
                          <div className="flex gap-1 mb-2">
                            <div className="w-6 h-6 rounded-full" style={{ backgroundColor: theme.primary }} />
                            <div className="w-6 h-6 rounded-full" style={{ backgroundColor: theme.secondary }} />
                            <div className="w-6 h-6 rounded-full" style={{ backgroundColor: theme.accent }} />
                          </div>
                          <p className="text-xs font-medium">{theme.name}</p>
                          {primaryColor === theme.primary && (
                            <CheckCircle className="w-4 h-4 absolute top-2 left-2 text-green-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Colors */}
                  <div className="border-t pt-5">
                    <p className="text-sm font-medium mb-3">ألوان مخصصة</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">اللون الأساسي</Label>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <input
                              type="color"
                              value={primaryColor}
                              onChange={e => setPrimaryColor(e.target.value)}
                              className="w-10 h-10 rounded-lg border-0 cursor-pointer p-0"
                            />
                          </div>
                          <Input
                            value={primaryColor}
                            onChange={e => setPrimaryColor(e.target.value)}
                            dir="ltr"
                            className="h-10 font-mono text-sm text-left flex-1"
                            maxLength={7}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">اللون الثانوي</Label>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <input
                              type="color"
                              value={secondaryColor}
                              onChange={e => setSecondaryColor(e.target.value)}
                              className="w-10 h-10 rounded-lg border-0 cursor-pointer p-0"
                            />
                          </div>
                          <Input
                            value={secondaryColor}
                            onChange={e => setSecondaryColor(e.target.value)}
                            dir="ltr"
                            className="h-10 font-mono text-sm text-left flex-1"
                            maxLength={7}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">لون التمييز</Label>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <input
                              type="color"
                              value={accentColor}
                              onChange={e => setAccentColor(e.target.value)}
                              className="w-10 h-10 rounded-lg border-0 cursor-pointer p-0"
                            />
                          </div>
                          <Input
                            value={accentColor}
                            onChange={e => setAccentColor(e.target.value)}
                            dir="ltr"
                            className="h-10 font-mono text-sm text-left flex-1"
                            maxLength={7}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Color Preview */}
                  <div className="border-t pt-5">
                    <p className="text-sm font-medium mb-3">معاينة</p>
                    <div className="flex gap-3 items-center">
                      <div className="flex-1 p-4 rounded-xl" style={{ backgroundColor: primaryColor }}>
                        <span className="text-white text-sm font-bold">أساسي</span>
                      </div>
                      <div className="flex-1 p-4 rounded-xl" style={{ backgroundColor: secondaryColor }}>
                        <span className="text-white text-sm font-bold">ثانوي</span>
                      </div>
                      <div className="flex-1 p-4 rounded-xl border" style={{ backgroundColor: accentColor }}>
                        <span className="text-xs font-bold" style={{ color: secondaryColor }}>تمييز</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/30 px-6 py-3">
                  <Button onClick={handleSaveTheme} disabled={updateMutation.isPending} className="bg-gradient-to-l from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white shadow-md">
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 ml-1" />}
                    تطبيق الألوان
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* ─── RECEIPT TAB ─── */}
            {activeTab === 'receipt' && (
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-l from-emerald-50 to-white pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <FileSignature className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">تخصيص الفاتورة</CardTitle>
                      <CardDescription className="text-xs">أضف لمستك الشخصية على إيصالات الطباعة</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-5">
                  {/* Receipt width */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">عرض ورق الطباعة</Label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setReceiptWidth('80')}
                        className={`flex-1 p-3 rounded-xl border-2 transition-all text-center ${
                          receiptWidth === '80' ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-transparent bg-muted/50 hover:bg-muted'
                        }`}
                      >
                        <Printer className="w-5 h-5 mx-auto mb-1" />
                        <p className="text-xs font-bold">80 مم</p>
                        <p className="text-[10px] text-muted-foreground">قياسي</p>
                      </button>
                      <button
                        onClick={() => setReceiptWidth('58')}
                        className={`flex-1 p-3 rounded-xl border-2 transition-all text-center ${
                          receiptWidth === '58' ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-transparent bg-muted/50 hover:bg-muted'
                        }`}
                      >
                        <Receipt className="w-5 h-5 mx-auto mb-1" />
                        <p className="text-xs font-bold">58 مم</p>
                        <p className="text-[10px] text-muted-foreground">مصغر</p>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">حجم الورق للطباعة</Label>
                    <Select value={receiptPaper} onValueChange={(v: any) => setReceiptPaper(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="thermal-80">حراري 80mm</SelectItem>
                        <SelectItem value="thermal-58">حراري 58mm</SelectItem>
                        <SelectItem value="a4">A4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">نمط الفاتورة</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {templatePresets.map((tpl) => (
                        <Button key={tpl.id} type="button" variant={receiptTemplate === tpl.id ? 'default' : 'outline'} onClick={() => setReceiptTemplate(tpl.id as any)} className="h-9">
                          <LayoutTemplate className="w-4 h-4 ml-1" /> {tpl.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Toggle switches */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                      <div>
                        <p className="text-sm font-medium">عرض الشعار</p>
                        <p className="text-xs text-muted-foreground">إظهار شعار المتجر في الفاتورة</p>
                      </div>
                      <Switch checked={receiptShowLogo} onCheckedChange={setReceiptShowLogo} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                      <div>
                        <p className="text-sm font-medium">عرض الضريبة</p>
                        <p className="text-xs text-muted-foreground">إظهار قيمة الضريبة منفصلة</p>
                      </div>
                      <Switch checked={showTaxOnReceipt} onCheckedChange={setShowTaxOnReceipt} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                      <div>
                        <p className="text-sm font-medium">عرض الخصم</p>
                        <p className="text-xs text-muted-foreground">إظهار سطر الخصم عند وجود خصومات</p>
                      </div>
                      <Switch checked={showDiscountOnReceipt} onCheckedChange={setShowDiscountOnReceipt} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                      <div>
                        <p className="text-sm font-medium">عرض QR Code</p>
                        <p className="text-xs text-muted-foreground">إظهار كود QR أسفل الفاتورة</p>
                      </div>
                      <Switch checked={showQrOnReceipt} onCheckedChange={setShowQrOnReceipt} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>حجم الخط</Label>
                      <Input type="number" value={receiptFontSize} onChange={e => setReceiptFontSize(Number(e.target.value) || 11)} min={9} max={14} />
                    </div>
                    <div className="space-y-2">
                      <Label>محاذاة المحتوى</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Button type="button" variant={receiptAlign === 'left' ? 'default' : 'outline'} onClick={() => setReceiptAlign('left')}><AlignLeft className="w-4 h-4" /></Button>
                        <Button type="button" variant={receiptAlign === 'center' ? 'default' : 'outline'} onClick={() => setReceiptAlign('center')}><AlignCenter className="w-4 h-4" /></Button>
                        <Button type="button" variant={receiptAlign === 'right' ? 'default' : 'outline'} onClick={() => setReceiptAlign('right')}><AlignRight className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </div>

                  {/* Custom texts */}
                  <div className="space-y-2">
                    <Label>نص رأس الفاتورة</Label>
                    <Textarea
                      value={receiptHeader}
                      onChange={e => setReceiptHeader(e.target.value)}
                      placeholder="مثال: نهاركم سعيد! 🌸"
                      className="min-h-[60px] resize-none"
                      maxLength={100}
                    />
                    <p className="text-[10px] text-muted-foreground">{(receiptHeader || '').length}/100</p>
                  </div>

                  <div className="space-y-2">
                    <Label>نص ذيل الفاتورة</Label>
                    <Textarea
                      value={receiptFooter}
                      onChange={e => setReceiptFooter(e.target.value)}
                      placeholder="مثال: شكراً لزيارتكم، نرجو لكم يوماً سعيداً!"
                      className="min-h-[60px] resize-none"
                      maxLength={200}
                    />
                    <p className="text-[10px] text-muted-foreground">{(receiptFooter || '').length}/200</p>
                  </div>

                  {receiptTemplates.length > 0 && (
                    <div className="space-y-2">
                      <Label>القوالب المحفوظة</Label>
                      <div className="space-y-2">
                        {receiptTemplates.map((tpl: any) => (
                          <div key={tpl.key} className="flex items-center justify-between rounded-lg border p-2 text-xs">
                            <span>{tpl.name}</span>
                            <Button type="button" size="sm" variant="ghost" onClick={() => {
                              setReceiptTemplate(tpl.receiptTemplate || 'simple');
                              setReceiptPaper(tpl.receiptPaper || 'thermal-80');
                              setReceiptAlign(tpl.receiptAlign || 'center');
                              setReceiptFontSize(tpl.receiptFontSize || 11);
                              setShowTaxOnReceipt(tpl.showTaxOnReceipt !== false);
                              setShowDiscountOnReceipt(tpl.showDiscountOnReceipt !== false);
                              setShowQrOnReceipt(tpl.showQrOnReceipt === true);
                              setReceiptShowLogo(tpl.receiptShowLogo !== false);
                              setReceiptHeader(tpl.receiptHeader || '');
                              setReceiptFooter(tpl.receiptFooter || '');
                            }}>تطبيق</Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="border-t bg-muted/30 px-6 py-3">
                  <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={saveCurrentTemplate}>
                    <LayoutTemplate className="w-4 h-4 ml-1" />
                    حفظ قالب جديد
                  </Button>
                  <Button onClick={handleSaveReceipt} disabled={updateMutation.isPending} className="bg-gradient-to-l from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-md">
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 ml-1" />}
                    حفظ إعدادات الفاتورة
                  </Button>
                  </div>
                </CardFooter>
              </Card>
            )}

            {/* ─── GENERAL TAB ─── */}
            {activeTab === 'general' && (
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-l from-blue-50 to-white pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">إعدادات عامة</CardTitle>
                      <CardDescription className="text-xs">العملة، الضرائب والمعاملات المالية</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>نسبة الضريبة (%)</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={taxRate}
                          onChange={e => setTaxRate(e.target.value)}
                          dir="ltr"
                          className="h-10 text-left pl-8"
                          min="0"
                          max="100"
                          step="0.5"
                        />
                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>رمز العملة</Label>
                      <div className="relative">
                        <Input
                          value={currencySymbol}
                          onChange={e => setCurrencySymbol(e.target.value)}
                          className="h-10"
                          maxLength={5}
                          placeholder="ر.س"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>كود العملة (ISO)</Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                          <SelectItem value="AED">درهم إماراتي (AED)</SelectItem>
                          <SelectItem value="QAR">ريال قطري (QAR)</SelectItem>
                          <SelectItem value="KWD">دينار كويتي (KWD)</SelectItem>
                          <SelectItem value="BHD">دينار بحريني (BHD)</SelectItem>
                          <SelectItem value="OMR">ريال عماني (OMR)</SelectItem>
                          <SelectItem value="EGP">جنيه مصري (EGP)</SelectItem>
                          <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                          <SelectItem value="EUR">يورو (EUR)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>الرقم الضريبي</Label>
                      <Input
                        value={taxNumber}
                        onChange={e => setTaxNumber(e.target.value)}
                        placeholder="300000000000003"
                        dir="ltr"
                        className="h-10 text-left"
                      />
                    </div>
                  </div>

                  {/* Info box */}
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <div className="flex gap-3">
                      <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-700">معلومة</p>
                        <p className="text-xs text-blue-600 mt-1">تغيير نسبة الضريبة سيتم تطبيقه على الفواتير الجديدة فقط. الفواتير السابقة لن تتأثر.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-red-700">حذف جميع المبيعات</p>
                        <p className="text-xs text-red-600 mt-1">
                          سيؤدي هذا الإجراء إلى حذف جميع الفواتير والمدفوعات وبنود الفواتير نهائياً.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={clearSalesMutation.isPending}
                        onClick={() => {
                          const confirmed = window.confirm('هل أنت متأكد من حذف جميع المبيعات؟ لا يمكن التراجع عن هذا الإجراء.');
                          if (confirmed) clearSalesMutation.mutate();
                        }}
                      >
                        {clearSalesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 ml-1" />}
                        حذف المبيعات
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/30 px-6 py-3">
                  <Button onClick={handleSaveStore} disabled={updateMutation.isPending} className="bg-gradient-to-l from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md">
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 ml-1" />}
                    حفظ الإعدادات العامة
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>

          {/* Receipt Live Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">معاينة الفاتورة مباشرة</CardTitle>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <div className="w-2 h-2 rounded-full bg-yellow-400" />
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="bg-gray-50/50 p-6 flex items-start justify-center min-h-[400px]">
                  <motion.div
                    key={`${activeTab}-${receiptWidth}-${receiptShowLogo}-${receiptTemplate}-${receiptPaper}-${receiptAlign}-${receiptFontSize}-${showQrOnReceipt}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ReceiptPreview settings={previewSettings} primaryColor={primaryColor} />
                  </motion.div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </AnimatedPage>
  );
}

// ═══════════════════════════════════════════════════════
// THEME APPLIER
// ═══════════════════════════════════════════════════════
function ThemeApplier() {
  const company = useAppStore(s => s.company);

  useEffect(() => {
    if (company?.primaryColor && company.primaryColor !== '#d97706') {
      applyTheme(company.primaryColor);
    } else {
      removeTheme();
    }
    return () => removeTheme();
  }, [company?.primaryColor]);

  return null;
}

// ═══════════════════════════════════════════════════════
// MAIN APPLICATION
// ═══════════════════════════════════════════════════════
function AppContent() {
  const user = useAppStore(s => s.user);
  const currentView = useAppStore(s => s.currentView);
  const setView = useAppStore(s => s.setView);
  const logout = useAppStore(s => s.logout);
  const company = useAppStore(s => s.company);
  const toggleFullscreen = useAppStore(s => s.toggleFullscreen);

  const navItems = [
    { view: 'dashboard' as View, label: 'لوحة التحكم', icon: LayoutDashboard },
    { view: 'pos' as View, label: 'نقطة البيع', icon: ShoppingCart },
    { view: 'invoices' as View, label: 'الفواتير', icon: FileText },
    { view: 'products' as View, label: 'المنتجات', icon: Package },
    { view: 'categories' as View, label: 'التصنيفات', icon: FolderOpen },
    ...(isOwner(user?.role) ? [{ view: 'branches' as View, label: 'الفروع', icon: Building2 }] : []),
    ...(isManager(user?.role) ? [{ view: 'users' as View, label: 'المستخدمين', icon: Users }] : []),
    { view: 'reports' as View, label: 'التقارير', icon: BarChart3 },
    { view: 'sales-analytics' as View, label: 'المبيعات التفصيلية', icon: TrendingUp },
    ...(isManager(user?.role) ? [{ view: 'audit-logs' as View, label: 'سجل العمليات', icon: Search }] : []),
    ...(isOwner(user?.role) ? [{ view: 'settings' as View, label: 'الإعدادات', icon: Settings }] : []),
  ];

  const renderView = () => {
    switch (currentView) {
      case 'pos': return <POSView />;
      case 'dashboard': return <DashboardView />;
      case 'invoices': return <InvoicesView />;
      case 'products': return <ProductsView />;
      case 'categories': return <CategoriesView />;
      case 'branches': return <BranchesView />;
      case 'users': return <UsersView />;
      case 'reports': return <ReportsView />;
      case 'sales-analytics': return <SalesAnalyticsView />;
      case 'audit-logs': return <AuditLogsView />;
      case 'settings': return <SettingsView />;
      default: return <POSView />;
    }
  };

  return (
    <SidebarProvider>
      <ThemeApplier />
      <div className="flex min-h-screen w-full">
        {/* Sidebar - right side for RTL */}
        <Sidebar side="right" variant="inset" collapsible="icon">
          <SidebarHeader className="border-b border-sidebar-border">
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shrink-0">
                <Coffee className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <h2 className="font-bold text-sm truncate">{company?.name || 'CafePOS'}</h2>
                <p className="text-[10px] text-muted-foreground truncate">نظام نقاط البيع</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map(item => (
                    <SidebarMenuItem key={item.view}>
                      <SidebarMenuButton
                        isActive={currentView === item.view}
                        onClick={() => setView(item.view)}
                        tooltip={{ children: item.label, side: 'left' }}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border">
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <UserCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <RoleBadge role={user?.role || ''} />
              </div>
              <Button
                variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 group-data-[collapsible=icon]:hidden"
                onClick={logout}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        {/* Main content */}
        <SidebarInset>
          {/* Header */}
          <header className="sticky top-0 z-10 flex items-center h-16 gap-4 border-b bg-white/80 backdrop-blur-sm px-4">
            <SidebarTrigger />
            <div className="flex-1" />
            <TimeDisplay />
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} title="ملء الشاشة">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            <div className={currentView === 'pos' ? '' : 'p-6'}>
              <AnimatePresence mode="wait">
                {renderView()}
              </AnimatePresence>
            </div>
          </div>
        </SidebarInset>
      </div>

      {/* Payment Dialog (global) */}
      <PaymentDialog />
    </SidebarProvider>
  );
}

// ═══════════════════════════════════════════════════════
// ROOT PAGE COMPONENT
// ═══════════════════════════════════════════════════════
export default function POSApp() {
  const [isReady, setIsReady] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const user = useAppStore(s => s.user);
  const setAuth = useAppStore(s => s.setAuth);

  useEffect(() => {
    const init = async () => {
      // Check if system needs setup
      try {
        const setupRes = await api.checkSetup();
        if (setupRes.needsSetup) {
          setNeedsSetup(true);
          setCheckingSetup(false);
          setIsReady(true);
          return;
        }
      } catch {
        // If setup check fails, assume setup is done
      }
      setCheckingSetup(false);

      // Try to restore existing session
      const token = localStorage.getItem('pos_token');
      if (token) {
        try {
          const res = await api.me();
          setAuth(res.user, token, res.company, res.branch);
        } catch {
          localStorage.removeItem('pos_token');
        }
      }
      setIsReady(true);
    };
    init();
  }, [setAuth]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!user) return;
      // Ctrl+K: Focus search (POS)
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="بحث"]') as HTMLInputElement;
        searchInput?.focus();
      }
      // F2: New invoice
      if (e.key === 'F2') {
        e.preventDefault();
        useAppStore.getState().clearCart();
        toast.info('فاتورة جديدة');
      }
      // F8: Pay
      if (e.key === 'F8') {
        e.preventDefault();
        if (useAppStore.getState().cart.length > 0) {
          useAppStore.getState().setPaymentDialogOpen(true);
        }
      }
      // F4: Clear cart
      if (e.key === 'F4') {
        e.preventDefault();
        useAppStore.getState().clearCart();
      }
      // Escape: Close dialogs
      if (e.key === 'Escape') {
        useAppStore.getState().setPaymentDialogOpen(false);
        useAppStore.getState().setSelectedInvoiceId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [user]);

  if (!isReady || checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-300 border-t-amber-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (needsSetup) return <SetupScreen />;
    return <LoginScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
