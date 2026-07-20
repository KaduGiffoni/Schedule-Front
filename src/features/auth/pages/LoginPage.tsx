import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { authService } from "../api/authService";
import type { LoginRequest } from "../types";
import { InputField } from "../../../components/ui/InputField";
import { Button } from "../../../components/ui/Button";
import { useAuthStore } from "../store/authStore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();
  const setTokenAndEmail = useAuthStore((state) => state.setTokenAndEmail);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      const requestData: LoginRequest = { email, password };
      const response = await authService.login(requestData);

      setTokenAndEmail(response.accessToken, email);
      // FIX: 2 — localStorage redundante removido

      navigate("/dashboard");
    } catch (error: any) {
      setErrorMsg(error.message ?? "Falha na conexão. Verifique suas credenciais.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-dvh flex items-center justify-center p-4"
      style={{
        backgroundColor: "var(--color-bg)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Background sutil — grade de pontos para ambiente técnico */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(var(--color-border) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
          opacity: 0.4,
        }}
      />

      {/* Glow ambiente */}
      <div
        className="fixed pointer-events-none"
        style={{
          width: "600px",
          height: "600px",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -60%)",
          background: `radial-gradient(ellipse at center, var(--color-accent-dim) 0%, transparent 70%)`,
        }}
      />

      {/* Card de login */}
      <div
        className="relative w-full max-w-[380px]"
        style={{
          animation: "login-enter 300ms var(--ease-out-expo) both",
        }}
      >
        <style>{`
          @keyframes login-enter {
            from { opacity: 0; transform: translateY(12px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        {/* Brand header */}
        <div className="text-center mb-7">
          {/* Logo */}
          <div className="inline-flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "var(--color-accent)" }}
            >
              {/* Ícone de antena/sinal NOC */}
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                <line x1="12" y1="20" x2="12" y2="20.01" strokeWidth="3" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-[18px] font-bold tracking-tight leading-none" style={{ color: "var(--color-text)" }}>
                NOC-PRO
              </p>
              <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--color-text-faint)" }}>
                Hub Operacional
              </p>
            </div>
          </div>

          <h1 className="text-[22px] font-semibold" style={{ color: "var(--color-text)" }}>
            Bem-vindo de volta
          </h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--color-text-muted)" }}>
            Insira suas credenciais para acessar o painel.
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div className="p-6">
            <form onSubmit={handleLogin} noValidate>
              <InputField
                label="E-mail"
                id="login-email"
                type="email"
                icon={Mail}
                placeholder="operador@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <div className="relative">
                <InputField
                  label="Senha"
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  icon={Lock}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      className="transition-colors duration-120"
                      style={{ color: "var(--color-text-faint)" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.color = "var(--color-text)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.color = "var(--color-text-faint)";
                      }}
                    >
                      {showPassword
                        ? <EyeOff size={15} strokeWidth={1.8} />
                        : <Eye size={15} strokeWidth={1.8} />
                      }
                    </button>
                  }
                />
              </div>

              {/* Erro global — inline e acessível */}
              {errorMsg && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4 text-[13px] font-medium"
                  style={{
                    backgroundColor: "var(--color-error-subtle)",
                    border: "1px solid var(--color-error)",
                    color: "var(--color-error)",
                  }}
                  role="alert"
                >
                  <AlertCircle size={14} strokeWidth={2} />
                  {errorMsg}
                </div>
              )}

              {/* Lembrar dispositivo */}
              <div className="flex items-center gap-2.5 mb-5">
                <input
                  type="checkbox"
                  id="login-remember"
                  className="w-4 h-4 rounded-[3px]"
                  style={{
                    accentColor: "var(--color-accent)",
                    cursor: "pointer",
                  }}
                />
                <label
                  htmlFor="login-remember"
                  className="text-[13px] cursor-pointer"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Lembrar por 30 dias
                </label>
                <span className="ml-auto">
                  <a
                    href="#"
                    className="text-[12px] font-medium"
                    style={{ color: "var(--color-accent-text)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.textDecoration = "underline";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.textDecoration = "none";
                    }}
                  >
                    Esqueceu a senha?
                  </a>
                </span>
              </div>

              <Button type="submit" isLoading={isLoading} fullWidth>
                Entrar
              </Button>
            </form>

            {/* Separador */}
            <div className="relative flex items-center my-5">
              <div className="flex-1" style={{ height: "1px", backgroundColor: "var(--color-border)" }} />
              <span
                className="flex-shrink-0 mx-4 text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--color-text-faint)" }}
              >
                ou
              </span>
              <div className="flex-1" style={{ height: "1px", backgroundColor: "var(--color-border)" }} />
            </div>

            {/* Google login */}
            <Button variant="outline" type="button">
              <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Entrar com o Google
            </Button>
          </div>

          {/* Footer do card */}
          <div
            className="px-6 py-4 text-center"
            style={{
              backgroundColor: "var(--color-surface-dim)",
              borderTop: "1px solid var(--color-border-subtle)",
            }}
          >
            <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>
              Não tem uma conta?{" "}
              <Link
                to="/register"
                className="font-semibold"
                style={{ color: "var(--color-accent-text)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.textDecoration = "none";
                }}
              >
                Criar nova conta
              </Link>
            </p>
          </div>
        </div>

        {/* Links legais */}
        <div className="flex items-center justify-between mt-6 px-1">
          <div className="flex gap-4">
            {["Privacidade", "Termos"].map((label) => (
              <a
                key={label}
                href="#"
                className="text-[11.5px] transition-colors"
                style={{ color: "var(--color-text-faint)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--color-text-faint)";
                }}
              >
                {label}
              </a>
            ))}
          </div>
          <span
            className="text-[11px] font-mono font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-faint)" }}
          >
            v2.4.0
          </span>
        </div>
      </div>
    </div>
  );
}
