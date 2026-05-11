import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
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
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      setErrorMsg(
        error.message ||
          "Erro ao tentar registrar. Verifique os dados e tente novamente.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fbf9fa] p-4 font-sans">
      <div className="bg-white w-full max-w-[480px] rounded-[4px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border-l-4 border-l-[#0058be] p-10">
        <div className="mb-8">
          <h1 className="text-[24px] font-bold text-[#041627] mb-2">
            Criar Nova Conta
          </h1>
          <p className="text-[14px] text-[#44474c] leading-relaxed">
            Insira as credenciais para registrar um novo operador no sistema.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 bg-[#ffdad6] text-[#ba1a1a] text-sm rounded-[4px] font-medium">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-3 bg-[#f0fdf4] text-[#15803d] text-sm rounded-[4px] font-medium border border-[#bbf7d0]">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-2">
          {/* 👇 Agora passamos a label e o ícone perfeitamente! */}
          <InputField
            label="E-mail"
            type="email"
            placeholder="exemplo@shifthub.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={Mail}
            required
          />

          <div>
            {/* 👇 Usamos o rightElement para colocar o botão de mostrar senha! */}
            <InputField
              label="Senha"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={Lock}
              required
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#74777d] hover:text-[#041627] transition-colors flex items-center justify-center"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
            <p className="text-[11px] text-[#74777d] italic -mt-2">
              Mínimo de 8 caracteres, incluindo números e símbolos.
            </p>
          </div>

          <div className="mt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0058be] hover:bg-[#004a9e] text-white py-3 rounded-[4px] font-medium flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? "A processar..." : "Cadastrar"}
              {!isLoading && <ArrowRight size={18} />}
            </Button>
          </div>
        </form>

        <hr className="my-6 border-[#e4e2e3]" />

        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-[12px] font-bold text-[#44474c] hover:text-[#0058be] uppercase tracking-wider transition-colors"
          >
            <ArrowRight size={16} /> JÁ POSSUI ACESSO? FAZER LOGIN
          </Link>
        </div>
      </div>
    </div>
  );
}
