import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'cashier';
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  login: (emailInput: string, passwordInput: string) => { success: boolean; message?: string };
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,

      login: (emailInput: string, passwordInput: string) => {
        const email = emailInput.trim().toLowerCase();
        const password = passwordInput.trim();

        // Default Credentials check
        if (email === 'admin@gmail.com' && password === 'admin123') {
          const user: User = {
            id: 'usr_admin_1',
            email: 'admin@gmail.com',
            name: 'WebRajya Administrator',
            role: 'admin'
          };
          set({ isAuthenticated: true, user });
          return { success: true };
        }

        return {
          success: false,
          message: 'Invalid email or password. Use default ID: admin@gmail.com / Pass: admin123'
        };
      },

      logout: () => {
        set({ isAuthenticated: false, user: null });
      }
    }),
    {
      name: 'webrajya_auth_session'
    }
  )
);
