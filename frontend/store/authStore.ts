import { create } from 'zustand';
import api from '@/lib/api';
import { getGuestToken, clearGuestToken } from '@/lib/guestToken';

interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('ilena_token') : null,
  loading: false,

  login: async (email, password) => {
    const guestToken = getGuestToken();
    const { data } = await api.post('/auth/login', { 
      email, 
      password,
      guest_token: guestToken // Send guest token for auto-claim
    });
    localStorage.setItem('ilena_token', data.token);
    clearGuestToken(); // Clear guest token after successful login
    set({ user: data.user, token: data.token });
    
    // Log claimed projects if any
    if (data.claimed_projects > 0) {
      console.log(`[Auto-Claim] ${data.claimed_projects} guest projects claimed`);
    }
  },

  register: async (name, email, password) => {
    const guestToken = getGuestToken();
    const { data } = await api.post('/auth/register', { 
      name, 
      email, 
      password,
      guest_token: guestToken // Send guest token for auto-claim
    });
    localStorage.setItem('ilena_token', data.token);
    clearGuestToken(); // Clear guest token after successful registration
    set({ user: data.user, token: data.token });
    
    // Log claimed projects if any
    if (data.claimed_projects > 0) {
      console.log(`[Auto-Claim] ${data.claimed_projects} guest projects claimed`);
    }
  },

  logout: () => {
    localStorage.removeItem('ilena_token');
    set({ user: null, token: null });
  },

  fetchMe: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data });
    } catch {
      set({ user: null, token: null });
    } finally {
      set({ loading: false });
    }
  },
}));
