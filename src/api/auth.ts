import { http } from './http';

export interface FirebaseConfigResponse {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  sucesso: boolean;
  idToken: string;
  refreshToken?: string;
  expiresIn?: string;
  localId?: string;
  email: string;
  mensagem?: string;
}

const TOKEN_KEY = 'token';
const USER_KEY = 'auth_user';

export const authStorage = {
  getToken: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken: (token: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {}
  },
  removeToken: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
  },
  getUser: (): LoginResponse | null => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setUser: (user: LoginResponse) => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {}
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
  },
};

export const authApi = {
  getFirebaseConfig: () => http.get<FirebaseConfigResponse>('/api/auth/firebase-config'),
  login: async (creds: LoginRequest): Promise<LoginResponse> => {
    const res = await http.post<LoginResponse>('/api/auth/login', creds);
    if (res?.idToken) {
      authStorage.setToken(res.idToken);
      authStorage.setUser(res);
    }
    return res;
  },
  logout: () => {
    authStorage.clear();
  },
};

