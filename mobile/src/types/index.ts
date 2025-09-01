export interface Personel {
    id: string;
    email: string;
    name: string;
  }
  
  export interface Admin {
    id: string;
    username: string;
  }
  
  export interface LoginResponse {
    token: string;
    user: Personel | Admin;
    type: 'personel' | 'admin';
  }
  
  export interface PersonelLoginData {
    email: string;
    password: string;
  }
  
  export interface AdminLoginData {
    username: string;
    password: string;
  }