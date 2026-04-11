import { create } from 'zustand';

export type View = 'pos' | 'dashboard' | 'invoices' | 'products' | 'categories' | 'branches' | 'users' | 'reports' | 'audit-logs' | 'settings';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId: string;
  branchId: string | null;
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  company: any | null;
  branch: any | null;
  setAuth: (user: User, token: string, company: any, branch: any) => void;
  logout: () => void;

  // Navigation
  currentView: View;
  setView: (view: View) => void;

  // Cart
  cart: CartItem[];
  currentInvoiceId: string | null;
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  discount: number;
  setDiscount: (d: number) => void;
  setCurrentInvoiceId: (id: string | null) => void;
  
  // Computed
  getSubtotal: () => number;
  getTax: () => number;
  getTotal: () => number;

  // Payment dialog
  paymentDialogOpen: boolean;
  setPaymentDialogOpen: (open: boolean) => void;

  // Invoice detail
  selectedInvoiceId: string | null;
  setSelectedInvoiceId: (id: string | null) => void;

  // Fullscreen
  isFullscreen: boolean;
  toggleFullscreen: () => void;

  // Theme
  updateCompany: (data: Partial<any>) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  token: null,
  company: null,
  branch: null,
  setAuth: (user, token, company, branch) => {
    localStorage.setItem('pos_token', token);
    set({ user, token, company, branch });
  },
  logout: () => {
    localStorage.removeItem('pos_token');
    set({ user: null, token: null, company: null, branch: null, cart: [], currentInvoiceId: null });
  },

  currentView: 'pos',
  setView: (view) => set({ currentView: view }),

  cart: [],
  currentInvoiceId: null,
  addToCart: (item) => {
    const { cart } = get();
    const existing = cart.find(c => c.productId === item.productId);
    if (existing) {
      set({
        cart: cart.map(c =>
          c.productId === item.productId
            ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.price }
            : c
        ),
      });
    } else {
      set({ cart: [...cart, { ...item, quantity: 1, total: item.price }] });
    }
  },
  removeFromCart: (productId) => {
    set({ cart: get().cart.filter(c => c.productId !== productId) });
  },
  updateCartQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }
    set({
      cart: get().cart.map(c =>
        c.productId === productId
          ? { ...c, quantity, total: quantity * c.price }
          : c
      ),
    });
  },
  clearCart: () => set({ cart: [], currentInvoiceId: null, discount: 0 }),
  discount: 0,
  setDiscount: (d) => set({ discount: d }),
  setCurrentInvoiceId: (id) => set({ currentInvoiceId: id }),

  getSubtotal: () => get().cart.reduce((sum, item) => sum + item.total, 0),
  getTax: () => {
    const subtotal = get().getSubtotal() - get().discount;
    return Math.round(subtotal * (get().company?.taxRate || 15) / 100 * 100) / 100;
  },
  getTotal: () => {
    const subtotal = get().getSubtotal() - get().discount;
    const tax = Math.round(subtotal * (get().company?.taxRate || 15) / 100 * 100) / 100;
    return subtotal + tax;
  },

  paymentDialogOpen: false,
  setPaymentDialogOpen: (open) => set({ paymentDialogOpen: open }),

  selectedInvoiceId: null,
  setSelectedInvoiceId: (id) => set({ selectedInvoiceId: id }),

  isFullscreen: false,
  toggleFullscreen: () => {
    if (typeof document !== 'undefined') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        set({ isFullscreen: true });
      } else {
        document.exitFullscreen();
        set({ isFullscreen: false });
      }
    }
  },

  updateCompany: (data) => {
    const { company } = get();
    if (company) {
      set({ company: { ...company, ...data } });
    }
  },
}));
