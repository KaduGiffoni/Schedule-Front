import React, { useEffect, useState } from "react";
import { UserPlus, Filter, X, Save, Pencil } from "lucide-react"; // Removido Trash2 e AlertTriangle
import { usersService, type User } from "../api/usersService";
import { InputField } from "../../../components/ui/InputField";
import { Button } from "../../../components/ui/Button";
import { Header } from "../../../components/layout/Header";
import { Sidebar } from "../../../components/layout/Sidebar";

const TEAM_BADGES: Record<number, string> = {
  1: "bg-blue-100 text-blue-700",
  2: "bg-orange-100 text-orange-700",
  3: "bg-purple-100 text-purple-700",
  4: "bg-emerald-100 text-emerald-700",
};

const TEAM_NAMES: Record<number, string> = {
  1: "EQUIPE A",
  2: "EQUIPE B",
  3: "EQUIPE C",
  4: "EQUIPE D",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // 👇 Adicionei a tipagem correta para permitir que letterId seja 'null'
  const [formData, setFormData] = useState<{
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

  const [isSaving, setIsSaving] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await usersService.getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error("Erro ao buscar usuários", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setFormData({
      completeName: user.completeName || "",
      surname: user.surname || "",
      registration: user.registration || "",
      letterId: user.letterId || null, // Se não tiver, passa null
      email: user.user,
    });
    setIsModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await usersService.updateProfile(formData);
      await fetchUsers();
      setIsModalOpen(false);
    } catch (error) {
      alert("Erro ao atualizar o perfil. Verifique as permissões.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#fbf9fa] font-sans overflow-hidden text-[#1b1c1d]">
      <Sidebar />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header />

        <main className="flex-1 bg-[#f5f7fb] p-8 overflow-y-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-[28px] font-extrabold text-[#041627] tracking-tight">
                Lista de Usuários
              </h1>
              <p className="text-[14px] text-[#74777d] mt-1">
                Gerenciamento centralizado de colaboradores e permissões
                industriais.
              </p>
            </div>
            <div className="flex gap-4">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e4e2e3] rounded-[6px] text-[14px] font-semibold text-[#44474c] shadow-sm hover:bg-gray-50 transition-colors">
                Filtrar por Equipe <Filter size={16} />
              </button>
              <Button className="flex items-center gap-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white px-5 py-2.5 rounded-[6px] shadow-sm font-semibold">
                <UserPlus size={18} /> Adicionar Novo Usuário
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-[8px] border border-[#e4e2e3] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e4e2e3]">
                    <th className="px-6 py-4 text-[12px] font-bold text-[#74777d] uppercase tracking-wider">
                      Nome Completo
                    </th>
                    <th className="px-6 py-4 text-[12px] font-bold text-[#74777d] uppercase tracking-wider">
                      Sobrenome
                    </th>
                    <th className="px-6 py-4 text-[12px] font-bold text-[#74777d] uppercase tracking-wider">
                      Matrícula
                    </th>
                    <th className="px-6 py-4 text-[12px] font-bold text-[#74777d] uppercase tracking-wider">
                      Equipe
                    </th>
                    <th className="px-6 py-4 text-[12px] font-bold text-[#74777d] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-[12px] font-bold text-[#74777d] uppercase tracking-wider">
                      E-mail
                    </th>
                    <th className="px-6 py-4 text-[12px] font-bold text-[#74777d] uppercase tracking-wider text-center">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#efedef]">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-10 text-[#74777d]"
                      >
                        Carregando usuários...
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr
                        key={user.userId}
                        className="hover:bg-[#fbf9fa] transition-colors group"
                      >
                        <td className="px-6 py-4 text-[14px] font-bold text-[#1b1c1d]">
                          {user.completeName || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-[14px] text-[#44474c]">
                          {user.surname || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-[14px] font-bold text-[#1d4ed8]">
                          #{user.registration || "0000"}
                        </td>

                        <td className="px-6 py-4">
                          {user.letterId ? (
                            <span
                              className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-[4px] ${TEAM_BADGES[user.letterId]}`}
                            >
                              {TEAM_NAMES[user.letterId]}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-[4px] bg-zinc-100 text-zinc-500">
                              Sem Equipe
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-[13px] font-semibold text-[#15803d]">
                            <span className="w-2 h-2 rounded-full bg-[#15803d]"></span>{" "}
                            Ativo
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[14px] text-[#44474c]">
                          {user.user}
                        </td>

                        <td className="px-6 py-4 text-center">
                          {/* 👇 Deixamos apenas o ícone de Editar */}
                          <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditClick(user)}
                              className="text-[#0058be] hover:text-[#004a9e] transition-colors p-1"
                              title="Editar Usuário"
                            >
                              <Pencil size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-[#e4e2e3] flex justify-between items-center bg-[#f8fafc]">
              <span className="text-[13px] text-[#74777d]">
                Exibindo{" "}
                <span className="font-bold text-[#1b1c1d]">{users.length}</span>{" "}
                usuários
              </span>
            </div>
          </div>
        </main>
      </div>

      {isModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="relative w-full max-w-[500px] bg-white rounded-[12px] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700"
            >
              <X size={20} />
            </button>

            <h2 className="text-[20px] font-bold text-[#041627] mb-1">
              Editar Perfil
            </h2>
            <p className="text-[13px] text-[#74777d] mb-6">
              Atualize os dados de <strong>{editingUser.user}</strong>.
            </p>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Nome Completo"
                  id="completeName"
                  value={formData.completeName}
                  onChange={(e) =>
                    setFormData({ ...formData, completeName: e.target.value })
                  }
                  required
                />
                <InputField
                  label="Sobrenome"
                  id="surname"
                  value={formData.surname}
                  onChange={(e) =>
                    setFormData({ ...formData, surname: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Matrícula (Ex: MT-8821)"
                  id="registration"
                  value={formData.registration}
                  onChange={(e) =>
                    setFormData({ ...formData, registration: e.target.value })
                  }
                  required
                />

                <div className="flex flex-col gap-1 w-full mb-4">
                  <label className="text-[12px] font-semibold text-[#44474c] uppercase tracking-wider">
                    Equipe (Letra)
                  </label>
                  <select
                    className="w-full h-[40px] px-3 text-[14px] text-[#1b1c1d] bg-[#fbf9fa] border border-[#c4c6cd] rounded-[4px] focus:outline-none focus:border-[#0058be]"
                    // Se for null, o select vai mostrar a opção 0 (Sem Equipe)
                    value={formData.letterId || 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      // 👇 Se o valor for 0 (Sem Equipe), envia null para a API
                      setFormData({
                        ...formData,
                        letterId: val === 0 ? null : val,
                      });
                    }}
                  >
                    {/* 👇 Nova opção para desvincular! */}
                    <option value={0}>Sem Equipe (Desvincular)</option>
                    <option value={1}>Equipe A</option>
                    <option value={2}>Equipe B</option>
                    <option value={3}>Equipe C</option>
                    <option value={4}>Equipe D</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white"
                >
                  {isSaving ? (
                    "A guardar..."
                  ) : (
                    <>
                      <Save size={18} className="mr-2" /> Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
