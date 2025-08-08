export interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  isActive: boolean;
  createdAt: string;
}

export interface Tutorial {
  id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
}

export interface Release {
  id: string;
  userId: string;
  clientName: string;
  clientCpf: string;
  clientEmail: string;
  clientPhone?: string;
  company: string;
  position: string;
  selectedTutorials: string[];
  status: 'active' | 'expired' | 'pending';
  createdAt: string;
  expiresAt?: string;
  user?: User;
}

export interface Stats {
  total: number;
  thisMonth: number;
  active: number;
  companies: number;
}
