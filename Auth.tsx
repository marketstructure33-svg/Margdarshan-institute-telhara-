import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { BookOpen } from 'lucide-react';

export default function AuthScreen() {
  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.warn('Error signing in with Google', error);
      if (error.code === 'auth/unauthorized-domain') {
        alert('Configuration required: Please add this domain to your Firebase Authorized Domains list in the Authentication settings.');
      } else {
        alert('Failed to sign in. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
        <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <BookOpen className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Margdarshan Institute Telhara</h1>
        <p className="text-slate-500 mb-8">Welcome back. Please sign in to access your study materials and dashboard.</p>
        
        <button
          onClick={handleSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium py-3 px-4 rounded-xl transition-colors"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
