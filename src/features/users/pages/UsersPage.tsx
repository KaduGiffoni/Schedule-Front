import React, { useEffect, useState } from "react";
import { UserPlus, Save, Pencil, Loader2 } from "lucide-react";
import { usersService, type User } from "../api/usersService";
import { InputField } from "../../../components/ui/InputField";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { showToast } from "../../../lib/toastStore";

// Badges de equipe — cores semânticas de dado (mantidas fixas por serem identidade visual)
const TEAM_BADGE_COLORS: Record<number, { bg: string; color: string }> = {
  1: { bg: "oklch(95% 0.04 255)", color: "oklch(42% 0.18 260)" },
  2: { bg: "oklch(95% 0.05 55)",  color: "oklch(58% 0.18 40)" },
  3: { bg: "oklch(95% 0.04 300)", color: "oklch(52% 0.18 300)" },
  4: { bg: "oklch(95% 0.04 150)", color: "oklch(48% 0.18 150)" },
};

const TEAM_NAMES: Record<number, string> = {
  1: "EQUIPE A", 2: "EQUIPE B", 3: "EQUIPE C", 4: "EQUIPE D",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<{
    completeName: string;
    surname: string;
    registration: string;
    letterId: number | null;
    email: string;
  }>({ completeName: "", surname: "", registration: "", letterId: null, email: "" });
  const [isSaving, setIsSaving] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      setUsers(await usersService.getAllUsers());
    } catch {
      showToast("Erro ao carregar usuários.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setFormData({
      completeName: user.completeName || "",
      surname: user.surname || "",
      registration: user.registration || "",
      letterId: user.letterId || null,
      email: user.user,
    });
    setIsModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setIsSaving(true);
    try {
      // FIX: 4 — Garante que o email não foi modificado e envia userId
      const payload = {
        ...formData,
        email: editingUser.user,
        userId: editingUser.userId
      };
      await usersService.updateProfile(payload);
      await fetchUsers();
      setIsModalOpen(false);
      showToast("Perfil atualizado com sucesso!", "success");
    } catch {
      showToast("Erro ao atualizar perfil. Verifique as permissões.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const thStyle: React.CSSProperties = {
    padding: "12px 20px",
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--color-text-faint)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}>
      <main style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
              Lista de Usuários
            </h1>
            <p style={{ fontSize: "14px", color: "var(--color-text-faint)", marginTop: "4px" }}>
              Gerenciamento centralizado de colaboradores e permissões.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {/* FIX: 13 — Botão Filtrar por Equipe removido (Dead UI) */}
            <Button style={{ backgroundColor: "var(--color-accent)", color: "white", width: "auto", padding: "0 20px" }}>
              <UserPlus size={16} /> &nbsp;Adicionar
            </Button>
          </div>
        </div>

        {/* Tabela */}
        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "10px", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--color-surface-dim)", borderBottom: "1px solid var(--color-border)" }}>
                  {["Nome Completo", "Sobrenome", "Matrícula", "Equipe", "Status", "E-mail", ""].map((h) => (
                    // FIX: 18 — uso de string única como key
                    <th key={h || "actions"} style={{ ...thStyle, textAlign: h === "" ? "center" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--color-text-faint)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                        <Loader2 size={18} className="animate-spin" style={{ color: "var(--color-accent)" }} />
                        Carregando usuários...
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--color-text-faint)", fontSize: "14px" }}>
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.userId}
                      style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-surface-raised)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                    >
                      <td style={{ padding: "14px 20px", fontSize: "14px", fontWeight: 700, color: "var(--color-text)" }}>
                        {user.completeName || "N/A"}
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: "14px", color: "var(--color-text-muted)" }}>
                        {user.surname || "N/A"}
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: "13px", fontWeight: 700, color: "var(--color-accent-text)", fontFamily: "var(--font-mono)" }}>
                        #{user.registration || "0000"}
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        {user.letterId ? (
                          <span style={{
                            padding: "2px 8px",
                            fontSize: "10px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            borderRadius: "4px",
                            letterSpacing: "0.04em",
                            ...TEAM_BADGE_COLORS[user.letterId],
                          }}>
                            {TEAM_NAMES[user.letterId]}
                          </span>
                        ) : (
                          <span style={{ padding: "2px 8px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", borderRadius: "4px", backgroundColor: "var(--color-surface-dim)", color: "var(--color-text-faint)" }}>
                            Sem Equipe
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: "var(--color-success)" }}>
                          <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "var(--color-success)", display: "inline-block" }} />
                          Ativo
                        </div>
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: "13px", color: "var(--color-text-muted)" }}>
                        {user.user}
                      </td>
                      <td style={{ padding: "14px 20px", textAlign: "center" }}>
                        <button
                          onClick={() => handleEditClick(user)}
                          aria-label={`Editar ${user.completeName || user.user}`}
                          style={{
                            color: "var(--color-accent)", background: "none", border: "none",
                            cursor: "pointer", padding: "6px", borderRadius: "6px",
                            display: "inline-flex", transition: "background-color 120ms ease-out",
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-accent-dim)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                        >
                          <Pencil size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-border)", backgroundColor: "var(--color-surface-dim)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--color-text-faint)" }}>
              Exibindo <strong style={{ color: "var(--color-text)" }}>{users.length}</strong> usuário{users.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </main>

      {/* Modal de edição — usa Modal.tsx */}
      {isModalOpen && editingUser && (
        <Modal
          title="Editar Perfil"
          icon={<Pencil size={17} />}
          onClose={() => setIsModalOpen(false)}
          size="md"
        >
          <p style={{ fontSize: "13px", color: "var(--color-text-faint)", marginBottom: "20px", marginTop: "-4px" }}>
            Atualize os dados de <strong style={{ color: "var(--color-text)" }}>{editingUser.user}</strong>.
          </p>
          <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <InputField label="Nome Completo" id="edit-completeName" value={formData.completeName}
                onChange={(e) => setFormData({ ...formData, completeName: e.target.value })} required />
              <InputField label="Sobrenome" id="edit-surname" value={formData.surname}
                onChange={(e) => setFormData({ ...formData, surname: e.target.value })} required />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <InputField label="Matrícula" id="edit-registration" value={formData.registration}
                onChange={(e) => setFormData({ ...formData, registration: e.target.value })} required />
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Equipe (Letra)
                </label>
                <select
                  style={{ width: "100%", height: "40px", padding: "0 12px", fontSize: "14px", color: "var(--color-text)", backgroundColor: "var(--color-surface-dim)", border: "1px solid var(--color-border)", borderRadius: "6px", outline: "none" }}
                  value={formData.letterId || 0}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setFormData({ ...formData, letterId: val === 0 ? null : val });
                  }}
                >
                  <option value={0}>Sem Equipe (Desvincular)</option>
                  <option value={1}>Equipe A</option>
                  <option value={2}>Equipe B</option>
                  <option value={3}>Equipe C</option>
                  <option value={4}>Equipe D</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "8px", borderTop: "1px solid var(--color-border-subtle)", marginTop: "4px" }}>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSaving} style={{ backgroundColor: "var(--color-accent)", color: "white" }}>
                {isSaving ? "Salvando..." : <><Save size={15} /> &nbsp;Salvar Alterações</>}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
