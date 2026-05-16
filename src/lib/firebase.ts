// Mocked Firebase Auth to allow local dev without setting up Firebase config
export const auth = {} as any;
export const db = {} as any;
export const googleProvider = {};

export const signInWithGoogle = async () => {
  return {
    uid: 'google_local_user',
    displayName: 'مدير (جوجل)',
    email: 'admin@google.com'
  };
};

export const loginWithEmail = async (email: string, pass: string) => {
  return {
    uid: 'email_local_user',
    displayName: email.split('@')[0],
    email: email
  };
};

export const registerWithEmail = async (email: string, pass: string) => {
  return {
    uid: 'email_local_user',
    displayName: email.split('@')[0],
    email: email
  };
};

export const logout = async () => {
  // Do nothing
}; 

