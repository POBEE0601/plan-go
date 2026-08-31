export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
}

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

export interface RegisterBody {
  email: string;
  password: string;
  name: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserPublic;
}

export interface JwtPayload {
  userId: string;
  email: string;
}
