export interface ApiUsageItem {
  kind: string;
  label: string;
  detail: string;
  used: number;
  limit: number | null;
  today: number | null;
  note: string | null;
}

export interface AdminMember {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminOverview {
  month: string;
  usage: ApiUsageItem[];
  members: AdminMember[];
}
