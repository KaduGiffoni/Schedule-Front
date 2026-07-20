import React, { useEffect, useState } from "react";
import { User as UserIcon, Lock, Save, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { usersService } from "../../users/api/usersService";
import { useAuthStore } from "../../auth/store/authStore";
import { InputField } from "../../../components/ui/InputField";
import { Button } from "../../../components/ui/Button";
import { showToast } from "../../../lib/toastStore";

// Mini-componente de input de senha com toggle de visibilidade
const PasswordInput = ({
  label, id, value,
  onChange, required,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label
        htmlFor={id}
        style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          required={required}
          style={{
            width: "100%", height: "40px",
            padding: "0 36px 0 12px",
            fontSize: "14px",
            color: "var(--color-text)",
            backgroundColor: "var(--color-surface-dim)",
            border: "1px solid var(--color-border)",
            borderRadius: "6px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          tabIndex={-1}
          style={{
            position: "absolute", right: "10px", top: "50%",
            transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer",
            color: "var(--color-text-faint)",
            display: "flex", alignItems: "center",
            transition: "color 120ms ease-out",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-faint)"; }}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
};

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Pega o email do store (set no login) em vez de hardcoded
  const email = useAuthStore((s) => s.email) ?? "";

  const [profileData, setProfileData] = useState({
    completeName: "", surname: "", registration: "",
    letterId: null as number | null, email: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "", newPassword: "", confirmPassword: "",
  });

  useEffect(() => {
    if (!email) { setIsLoading(false); return; }
    const load = async () => {
      try {
        const user = await usersService.getUserByEmail(email);
        setProfileData({
          completeName: user.completeName || "",
          surname: user.surname || "",
          registration: user.registration || "",
          letterId: user.letterId || null,
          email: user.user,
        });
      } catch {
        showToast("Erro ao carregar perfil.", "error");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [email]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await usersService.updateProfile(profileData);
      showToast("Perfil atualizado com sucesso!", "success");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { Message?: string } } };
      showToast("Falha ao atualizar perfil: " + (err.response?.data?.Message || "Erro desconhecido"), "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast("A nova senha e a confirmação não coincidem.", "warning");
      return;
    }

    // FIX: 16 — Validação de força de senha
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(passwordData.newPassword)) {
      showToast("A senha deve ter pelo menos 8 caracteres, uma letra maiúscula, minúscula, um número e um caractere especial.", "error");
      return;
    }
    setIsSavingPassword(true);
    try {
      await usersService.changePassword({
        email: profileData.email,
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      showToast("Senha alterada com sucesso!", "success");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { Message?: string } } };
      showToast("Falha ao alterar senha: " + (err.response?.data?.Message || "Verifique sua senha atual."), "error");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "12px",
    boxShadow: "var(--shadow-sm)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };

  const cardHeaderStyle: React.CSSProperties = {
    backgroundColor: "var(--color-surface-dim)",
    padding: "16px 24px",
    borderBottom: "1px solid var(--color-border)",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  };

  const selectStyle: React.CSSProperties = {
    width: "100%", height: "40px", padding: "0 12px",
    fontSize: "14px", color: "var(--color-text)",
    backgroundColor: "var(--color-surface-dim)",
    border: "1px solid var(--color-border)",
    borderRadius: "6px", outline: "none",
  };

  return (
    <div style={{ flex: 1, overflow: "hidden", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}>
      <main style={{ flex: 1, padding: "32px", overflowY: "auto", height: "100%" }}>
        <div style={{ marginBottom: "28px", maxWidth: "860px", margin: "0 auto 28px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
            Meu Perfil
          </h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-faint)", marginTop: "4px" }}>
            Gerencie suas informações pessoais e credenciais de acesso.
          </p>
        </div>

        <div style={{ maxWidth: "860px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Coluna 1: Dados Pessoais */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div style={{ width: "34px", height: "34px", borderRadius: "50%", backgroundColor: "var(--color-accent-dim)", color: "var(--color-accent-text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <UserIcon size={18} />
              </div>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text)" }}>
                Informações Pessoais
              </h2>
            </div>
            <div style={{ padding: "24px", flex: 1 }}>
              {isLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton" style={{ height: "40px", borderRadius: "6px" }} />
                  ))}
                </div>
              ) : (
                <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <InputField label="Nome" id="profile-name" value={profileData.completeName}
                      onChange={(e) => setProfileData({ ...profileData, completeName: e.target.value })} required />
                    <InputField label="Apelido" id="profile-surname" value={profileData.surname}
                      onChange={(e) => setProfileData({ ...profileData, surname: e.target.value })} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <InputField label="Matrícula" id="profile-reg" value={profileData.registration}
                      onChange={(e) => setProfileData({ ...profileData, registration: e.target.value })} required />
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Equipe Base
                      </label>
                      <select style={selectStyle}
                        value={profileData.letterId || 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setProfileData({ ...profileData, letterId: val === 0 ? null : val });
                        }}
                      >
                        <option value={0}>Sem Equipe</option>
                        <option value={1}>Equipe A</option>
                        <option value={2}>Equipe B</option>
                        <option value={3}>Equipe C</option>
                        <option value={4}>Equipe D</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: "auto", paddingTop: "16px", display: "flex", justifyContent: "flex-end" }}>
                    <Button type="submit" disabled={isSavingProfile} style={{ backgroundColor: "var(--color-accent)", color: "white", width: "auto", padding: "0 20px" }}>
                      {isSavingProfile ? "Salvando..." : <><Save size={15} /> &nbsp;Salvar Perfil</>}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Coluna 2: Segurança */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div style={{ width: "34px", height: "34px", borderRadius: "50%", backgroundColor: "var(--color-accent-dim)", color: "var(--color-accent-text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShieldCheck size={18} />
              </div>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text)" }}>
                Segurança da Conta
              </h2>
            </div>
            <div style={{ padding: "24px", flex: 1 }}>
              <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%" }}>
                <p style={{ fontSize: "13px", color: "var(--color-text-faint)" }}>
                  Para proteger sua conta, você precisará da sua senha atual para definir uma nova.
                </p>
                <PasswordInput label="Senha Atual" id="pwd-current" value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} required />
                <PasswordInput label="Nova Senha" id="pwd-new" value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} required />
                <PasswordInput label="Confirmar Nova Senha" id="pwd-confirm" value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} required />
                <div style={{ marginTop: "auto", paddingTop: "16px", display: "flex", justifyContent: "flex-end" }}>
                  <Button type="submit" disabled={isSavingPassword || !passwordData.newPassword}
                    style={{ backgroundColor: "var(--color-accent)", color: "white", width: "auto", padding: "0 20px" }}>
                    {isSavingPassword ? "Atualizando..." : <><Lock size={15} /> &nbsp;Atualizar Senha</>}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
