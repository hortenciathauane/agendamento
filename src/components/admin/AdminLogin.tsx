import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowLeft, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBackToHome: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onBackToHome,
}) => {
  const [emailOrUser, setEmailOrUser] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!emailOrUser.trim() || !password.trim()) {
      setErrorMsg('Por favor, preencha todos os campos.');
      return;
    }

    setIsLoading(true);

    // Realistic admin verification
    setTimeout(() => {
      // Accepts standard demo credentials or any reasonable login
      const validEmails = ['contato@studiobella.com.br', 'isabella@studiobella.com.br', 'admin', 'cabeleireira'];
      const isUserMatch = validEmails.includes(emailOrUser.toLowerCase().trim()) || emailOrUser.includes('@');
      
      if (isUserMatch && password.length >= 4) {
        setIsLoading(false);
        onLoginSuccess();
      } else {
        setIsLoading(false);
        setErrorMsg('E-mail/usuário ou senha incorretos. Utilize a conta de demonstração.');
      }
    }, 400);
  };

  const handleFillDemo = () => {
    setEmailOrUser('contato@studiobella.com.br');
    setPassword('admin123');
    setErrorMsg('');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-16">
      
      <button
        onClick={onBackToHome}
        className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar para Página Inicial</span>
      </button>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-md space-y-6">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-stone-900 text-amber-300 flex items-center justify-center mx-auto shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold tracking-wider text-amber-800 uppercase">
            Acesso Restrito
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            Painel da Cabeleireira
          </h2>
          <p className="text-xs text-stone-700">
            Entre com suas credenciais para gerenciar a agenda, aprovar clientes e configurar horários.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-stone-500" />
              <span>E-mail ou Usuário</span>
            </label>
            <input
              type="text"
              required
              value={emailOrUser}
              onChange={(e) => setEmailOrUser(e.target.value)}
              placeholder="ex: contato@studiobella.com.br"
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-stone-500" />
              <span>Senha</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
          >
            {isLoading ? (
              <span>Autenticando...</span>
            ) : (
              <>
                <span>Acessar Painel Administrativo</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo credentials quick button */}
        <div className="pt-4 border-t border-stone-100 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-stone-700">
            <span>Credenciais para teste rápido:</span>
          </div>
          <button
            type="button"
            onClick={handleFillDemo}
            className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Preencher E-mail & Senha Demo</span>
          </button>
        </div>

      </div>

    </div>
  );
};
