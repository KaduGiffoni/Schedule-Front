import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Building2 } from 'lucide-react';
import { authService } from '../api/authService';
import type { LoginRequest } from '../types';
import { InputField } from '../../../components/ui/InputField';
import { Button } from '../../../components/ui/Button';

import { useAuthStore } from '../store/authStore'; 

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const navigate = useNavigate();
  
  const setTokenAndEmail = useAuthStore((state) => state.setTokenAndEmail);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const requestData: LoginRequest = { email, password };
      const response = await authService.login(requestData);
      
      // 👇 Guardamos no Zustand o Token que veio da API e o Email que o utilizador digitou!
      setTokenAndEmail(response.accessToken, email);
      
      // Navegamos para o Dashboard com sucesso!
      navigate('/dashboard');
      
    } catch (error: any) {
      setErrorMsg(error.message || "Erro inesperado ao conectar com a API.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f3f4] flex flex-col items-center justify-center p-4 font-sans text-[#1b1c1d]">
      <div className="w-full max-w-[400px] bg-white rounded-[8px] shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-[#e4e2e3] overflow-hidden">
        <div className="flex flex-col items-center pt-8 pb-6 px-6 border-b border-[#efedef]">
          <div className="w-12 h-12 bg-[#041627] rounded-[8px] flex items-center justify-center mb-4 shadow-sm">
            <Building2 color="white" size={24} />
          </div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#041627] leading-tight">
            NOC - Pro
          </h1>
          <p className="text-[14px] text-[#44474c] mt-1">
            Hub do NOC
          </p>
        </div>

        <div className="p-6">
          <h2 className="text-[18px] font-semibold mb-1">Bem-vindo de volta</h2>
          <p className="text-[14px] text-[#44474c] mb-6">
            Insira os seus dados para aceder ao painel.
          </p>

          <form onSubmit={handleLogin}>
            <InputField
              label="E-mail"
              id="email"
              type="email"
              icon={Mail}
              placeholder="exemplo@shifthub.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="relative">
              <div className="absolute right-0 top-0 text-[12px] font-medium text-[#0058be] hover:underline cursor-pointer z-10">
                Esqueceu a senha?
              </div>
              <InputField
                label="Senha"
                id="password"
                type={showPassword ? "text" : "password"}
                icon={Lock}
                placeholder="••••••••"
                error={errorMsg}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#74777d] hover:text-[#1b1c1d] focus:outline-none"
                    aria-label={
                      showPassword ? "Ocultar senha" : "Mostrar senha"
                    }
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
            </div>

            <div className="flex items-center gap-2 mb-6 mt-2">
              <input
                type="checkbox"
                id="remember"
                className="w-4 h-4 rounded-[2px] border-[#c4c6cd] text-[#0058be] focus:ring-[#0058be]"
              />
              <label
                htmlFor="remember"
                className="text-[14px] text-[#44474c] cursor-pointer"
              >
                Lembrar neste dispositivo por 30 dias
              </label>
            </div>

            <Button type="submit" isLoading={isLoading}>
              Entrar →
            </Button>
          </form>

          <div className="relative flex items-center py-6">
            <div className="flex-grow border-t border-[#e4e2e3]"></div>
            <span className="flex-shrink-0 mx-4 text-[#74777d] text-[12px] uppercase tracking-wider font-semibold">
              Ou continue com
            </span>
            <div className="flex-grow border-t border-[#e4e2e3]"></div>
          </div>

          <Button variant="outline" type="button">
            <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Entrar com o Google
          </Button>
        </div>

        <div className="bg-[#f5f3f4] py-4 text-center border-t border-[#efedef]">
          <p className="text-[14px] text-[#44474c]">
            Ainda não tem conta?{" "}
            {/* 👇 Aqui está o link mágico para a nossa nova página! */}
            <Link to="/register" className="text-[#0058be] font-bold hover:underline">
              Criar nova conta
            </Link>
          </p>
        </div>
      </div>

      <div className="w-full max-w-[400px] flex justify-between items-center mt-6 text-[12px] text-[#74777d]">
        <div className="flex gap-4">
          <a href="#" className="hover:text-[#1b1c1d]">
            Política de Privacidade
          </a>
          <a href="#" className="hover:text-[#1b1c1d]">
            Termos de Serviço
          </a>
        </div>
        <span className="font-semibold uppercase tracking-wider">
          v2.4.0-PRO
        </span>
      </div>
    </div>
  );
}