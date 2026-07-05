import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { authService } from "../api/authService";
import type { LoginRequest } from "../types";
import { InputField } from "../../../components/ui/InputField";
import { Button } from "../../../components/ui/Button";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);

    try {
      const requestData: LoginRequest = { email, password };
      await authService.register(requestData);
      setSuccessMsg("Conta criada com sucesso! Redirecionando...");
      setTimeout(() => { navigate("/login"); }, 2000);
    } catch (error: unknown) {
      const err = error as { message?: string };
      setErrorMsg(err.message || "Erro ao tentar registrar. Verifique os dados e tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-bg)",
        padding: "16px",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Background sutil */}
      <div
        style={{
          position: "fixed", inset: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(var(--color-border) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          opacity: 0.4,
        }}
      />

      <div
        style={{
          position: "relative",
          backgroundColor: "var(--color-surface)",
          width: "100%",
          maxWidth: "440px",
          borderRadius: "14px",
          border: "1px solid var(--color-border)",
          borderLeft: `4px solid var(--color-accent)`,
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "36px 36px 32px" }}>
          <div style={{ marginBottom: "28px" }}>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-text)", marginBottom: "6px" }}>
              Criar Nova Conta
            </h1>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
              Insira as credenciais para registrar um novo operador no sistema.
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                marginBottom: "20px", padding: "10px 14px",
                backgroundColor: "var(--color-error-subtle)",
                border: "1px solid var(--color-error)",
                color: "var(--color-error)",
                borderRadius: "8px",
                fontSize: "13px", fontWeight: 500,
              }}
            >
              <AlertCircle size={14} />
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                marginBottom: "20px", padding: "10px 14px",
                backgroundColor: "var(--color-success-subtle)",
                border: "1px solid var(--color-success)",
                color: "var(--color-success)",
                borderRadius: "8px",
                fontSize: "13px", fontWeight: 500,
              }}
            >
              <CheckCircle2 size={14} />
              {successMsg}
            </div>
          )}

          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <InputField
              label="E-mail"
              id="register-email"
              type="email"
              placeholder="operador@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
              required
            />

            <div>
              <InputField
                label="Senha"
                id="register-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={Lock}
                required
                rightElement={
                  <button
                    type="button"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      color: "var(--color-text-faint)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "none", border: "none", cursor: "pointer",
                      transition: "color 120ms ease-out",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-faint)"; }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
              <p style={{ fontSize: "11px", color: "var(--color-text-faint)", fontStyle: "italic", marginTop: "4px" }}>
                Mínimo de 8 caracteres, incluindo números e símbolos.
              </p>
            </div>

            <div style={{ marginTop: "8px" }}>
              <Button type="submit" disabled={isLoading} isLoading={isLoading}>
                {isLoading ? "Processando..." : <><span>Cadastrar</span><ArrowRight size={16} /></>}
              </Button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 36px",
            borderTop: "1px solid var(--color-border-subtle)",
            backgroundColor: "var(--color-surface-dim)",
            textAlign: "center",
          }}
        >
          <Link
            to="/"
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              fontSize: "12px", fontWeight: 700,
              color: "var(--color-text-muted)",
              textTransform: "uppercase", letterSpacing: "0.05em",
              textDecoration: "none",
              transition: "color 120ms ease-out",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-accent-text)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)"; }}
          >
            <ArrowRight size={14} /> Já possui acesso? Fazer Login
          </Link>
        </div>
      </div>
    </div>
  );
}
