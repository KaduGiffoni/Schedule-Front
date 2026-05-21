import React, { useEffect, useState } from "react";
import {
  User as UserIcon,
  Lock,
  Save,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react"; // 👇 Importamos Eye e EyeOff
import { usersService } from "../../users/api/usersService";
import { InputField } from "../../../components/ui/InputField";
import { Button } from "../../../components/ui/Button";

// 👇 Novo mini-componente criado exclusivamente para lidar com senhas e o "olhinho"
const PasswordInput = ({ label, id, value, onChange, required }: any) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex flex-col gap-1 w-full">
      <label
        htmlFor={id}
        className="text-[12px] font-semibold text-[#44474c] uppercase tracking-wider"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          required={required}
          className="w-full h-[40px] px-3 pr-10 text-[14px] text-[#1b1c1d] bg-[#fbf9fa] border border-[#c4c6cd] rounded-[4px] focus:outline-none focus:border-[#0058be]"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#74777d] hover:text-[#0058be] transition-colors focus:outline-none"
          tabIndex={-1} // Evita que o Tab pare no ícone do olho
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
};

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // E-mail do utilizador logado
  const loggedInEmail = "kadugiffoni@gmail.com";

  const [profileData, setProfileData] = useState<{
    completeName: string;
    surname: string;
    registration: string;
    letterId: number | null;
    email: string;
  }>({
    completeName: "",
    surname: "",
    registration: "",
    letterId: null,
    email: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = await usersService.getUserByEmail(loggedInEmail);
        setProfileData({
          completeName: user.completeName || "",
          surname: user.surname || "",
          registration: user.registration || "",
          letterId: user.letterId || 0,
          email: user.user,
        });
      } catch (error) {
        console.error(
          "Erro ao carregar perfil. Verifique se o e-mail está correto no banco de dados.",
          error,
        );
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, [loggedInEmail]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await usersService.updateProfile(profileData);
      alert("Perfil atualizado com sucesso!");
    } catch (error: any) {
      alert(
        "Falha ao atualizar perfil: " +
          (error.response?.data?.Message || "Erro desconhecido"),
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("A nova senha e a confirmação não coincidem.");
      return;
    }

    setIsSavingPassword(true);
    try {
      await usersService.changePassword({
        email: profileData.email,
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      alert("Senha alterada com sucesso!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      alert(
        "Falha ao alterar senha: " +
          (error.response?.data?.Message || "Verifique sua senha atual."),
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#fbf9fa] h-full w-full">
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="mb-8 max-w-4xl mx-auto">
          <h1 className="text-[28px] font-extrabold text-[#041627] tracking-tight">
            Meu Perfil
          </h1>
          <p className="text-[14px] text-[#74777d] mt-1">
            Gerencie suas informações pessoais e credenciais de acesso.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* COLUNA 1: Dados Pessoais */}
          <div className="bg-white rounded-[8px] border border-[#e4e2e3] shadow-sm overflow-hidden flex flex-col">
            <div className="bg-[#f8fafc] px-6 py-4 border-b border-[#e4e2e3] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#e0e7ff] text-[#0058be] flex items-center justify-center">
                <UserIcon size={18} />
              </div>
              <h2 className="text-[16px] font-bold text-[#041627]">
                Informações Pessoais
              </h2>
            </div>

            <div className="p-6 flex-1">
              {isLoading ? (
                <div className="animate-pulse flex flex-col gap-4">
                  <div className="h-10 bg-zinc-100 rounded w-full"></div>
                  <div className="h-10 bg-zinc-100 rounded w-full"></div>
                  <div className="h-10 bg-zinc-100 rounded w-full"></div>
                </div>
              ) : (
                <form
                  onSubmit={handleUpdateProfile}
                  className="flex flex-col gap-4 h-full"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="Nome"
                      id="completeName"
                      value={profileData.completeName}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          completeName: e.target.value,
                        })
                      }
                      required
                    />
                    <InputField
                      label="Apelido"
                      id="surname"
                      value={profileData.surname}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          surname: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="Matrícula"
                      id="registration"
                      value={profileData.registration}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          registration: e.target.value,
                        })
                      }
                      required
                    />

                    <div className="flex flex-col gap-1 w-full">
                      <label className="text-[12px] font-semibold text-[#44474c] uppercase tracking-wider">
                        Equipe Base
                      </label>
                      <select
                        className="w-full h-[40px] px-3 text-[14px] text-[#1b1c1d] bg-[#fbf9fa] border border-[#c4c6cd] rounded-[4px] focus:outline-none focus:border-[#0058be]"
                        value={profileData.letterId || 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setProfileData({
                            ...profileData,
                            letterId: val === 0 ? null : val,
                          });
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

                  <div className="mt-auto pt-6 flex justify-end">
                    <Button
                      type="submit"
                      disabled={isSavingProfile}
                      className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white"
                    >
                      {isSavingProfile ? (
                        "Salvando..."
                      ) : (
                        <>
                          <Save size={18} className="mr-2" /> Salvar Perfil
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* COLUNA 2: Alterar Senha */}
          <div className="bg-white rounded-[8px] border border-[#e4e2e3] shadow-sm overflow-hidden flex flex-col">
            <div className="bg-[#f8fafc] px-6 py-4 border-b border-[#e4e2e3] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#fce7f3] text-[#4f46e5] flex items-center justify-center">
                <ShieldCheck size={18} />
              </div>
              <h2 className="text-[16px] font-bold text-[#041627]">
                Segurança da Conta
              </h2>
            </div>

            <div className="p-6 flex-1">
              <form
                onSubmit={handleChangePassword}
                className="flex flex-col gap-4 h-full"
              >
                <p className="text-[13px] text-[#74777d] mb-2">
                  Para proteger sua conta, você precisará da sua senha atual
                  para definir uma nova.
                </p>

                {/* 👇 Agora usamos o nosso novo PasswordInput com o olhinho! */}
                <PasswordInput
                  label="Senha Atual"
                  id="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={(e: any) =>
                    setPasswordData({
                      ...passwordData,
                      currentPassword: e.target.value,
                    })
                  }
                  required
                />

                <PasswordInput
                  label="Nova Senha"
                  id="newPassword"
                  value={passwordData.newPassword}
                  onChange={(e: any) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                  required
                />

                <PasswordInput
                  label="Confirmar Nova Senha"
                  id="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={(e: any) =>
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value,
                    })
                  }
                  required
                />

                <div className="mt-auto pt-6 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSavingPassword || !passwordData.newPassword}
                    className="bg-[#4f46e5] hover:bg-[#4338ca] text-white"
                  >
                    {isSavingPassword ? (
                      "Atualizando..."
                    ) : (
                      <>
                        <Lock size={18} className="mr-2" /> Atualizar Senha
                      </>
                    )}
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
