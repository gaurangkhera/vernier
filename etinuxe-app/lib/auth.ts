import { NextAuthOptions } from 'next-auth';

// Minimal auth config - temporarily disabled
export const authOptions: NextAuthOptions = {
  providers: [],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
};
