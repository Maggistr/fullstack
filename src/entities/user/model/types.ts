export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface RegistrationData extends Credentials {
  name: string;
}
