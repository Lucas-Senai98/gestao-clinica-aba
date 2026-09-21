/**
 * src/lib/permissions.ts
 *
 * Módulo de Controle de Acesso Baseado em Permissões (RBAC Granular).
 * Permite ao Usuário Master definir acessos específicos para cada profissional.
 */

export type PermissionSlug =
  | "patients:view"
  | "patients:manage"
  | "patients:pep"
  | "sessions:record"
  | "sessions:view"
  | "approvals:manage"
  | "pei:view"
  | "pei:manage"
  | "agenda:view"
  | "agenda:manage"
  | "hours:view"
  | "financial:view"
  | "financial:manage"
  | "reports:view"
  | "reports:export"
  | "audit:view"
  | "team:view"
  | "team:manage"
  | "forum:access";

export interface PermissionItem {
  id: PermissionSlug;
  label: string;
  description: string;
  module: string;
}

export interface PermissionGroup {
  id: string;
  label: string;
  permissions: PermissionItem[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "patients",
    label: "Pacientes & Prontuário",
    permissions: [
      {
        id: "patients:view",
        label: "Visualizar Pacientes",
        description: "Acessar listagem de pacientes e perfil clínico básico",
        module: "patients",
      },
      {
        id: "patients:manage",
        label: "Cadastrar & Editar Pacientes",
        description: "Criar novo paciente, editar cadastro e alterar status",
        module: "patients",
      },
      {
        id: "patients:pep",
        label: "Prontuário Eletrônico (PEP)",
        description: "Acessar e editar prontuário completo, histórico e anamnese",
        module: "patients",
      },
    ],
  },
  {
    id: "sessions",
    label: "Atendimentos & Sessões ABA",
    permissions: [
      {
        id: "sessions:record",
        label: "Registrar Sessão ABA",
        description: "Cronômetro, tentativas discretas, mandos e intercorrências",
        module: "sessions",
      },
      {
        id: "sessions:view",
        label: "Histórico de Folhas de Sessão",
        description: "Consultar registros clínicos de sessões anteriores",
        module: "sessions",
      },
      {
        id: "approvals:manage",
        label: "Aprovação de Evoluções",
        description: "Validar, aprovar ou rejeitar evoluções clínicas da equipe",
        module: "sessions",
      },
    ],
  },
  {
    id: "pei",
    label: "Plano de Ensino (PEI)",
    permissions: [
      {
        id: "pei:view",
        label: "Visualizar Metas do PEI",
        description: "Consultar objetivos terapêuticos e habilidades do paciente",
        module: "pei",
      },
      {
        id: "pei:manage",
        label: "Gerenciar Programas & Metas",
        description: "Criar e editar metas, programas curriculares e critérios",
        module: "pei",
      },
    ],
  },
  {
    id: "agenda",
    label: "Agenda & Banco de Horas",
    permissions: [
      {
        id: "agenda:view",
        label: "Visualizar Agenda Clínica",
        description: "Visualizar calendário e horários de atendimento",
        module: "agenda",
      },
      {
        id: "agenda:manage",
        label: "Agendar & Remarcar Sessões",
        description: "Criar novos agendamentos e alterar horários de sessões",
        module: "agenda",
      },
      {
        id: "hours:view",
        label: "Acompanhar Banco de Horas",
        description: "Visualizar quadro de carga horária e pontualidade",
        module: "agenda",
      },
    ],
  },
  {
    id: "financial",
    label: "Financeiro & Repasses",
    permissions: [
      {
        id: "financial:view",
        label: "Visualizar DRE & Faturamento",
        description: "Consultar extrato de faturamento e repasse terapêutico",
        module: "financial",
      },
      {
        id: "financial:manage",
        label: "Gerenciar Contas a Pagar e Receber",
        description: "Lançar e liquidar faturas, despesas e configurar taxas",
        module: "financial",
      },
    ],
  },
  {
    id: "reports",
    label: "Relatórios & Auditoria",
    permissions: [
      {
        id: "reports:view",
        label: "Visualizar Relatórios e Gráficos",
        description: "Acessar gráficos de evolução e relatórios quantitativos",
        module: "reports",
      },
      {
        id: "reports:export",
        label: "Emitir Laudos e Relatórios Formais",
        description: "Gerar e imprimir relatórios multiprofissionais em PDF",
        module: "reports",
      },
      {
        id: "audit:view",
        label: "Trilha de Auditoria LGPD",
        description: "Acessar logs imutáveis de segurança e conformidade",
        module: "reports",
      },
    ],
  },
  {
    id: "team",
    label: "Equipe & Comunicação",
    permissions: [
      {
        id: "team:view",
        label: "Visualizar Equipe",
        description: "Consultar quadro de profissionais e especialidades",
        module: "team",
      },
      {
        id: "team:manage",
        label: "Gestão de Usuários & Permissões",
        description: "Criar usuários, resetar senhas e alterar permissões (Master)",
        module: "team",
      },
      {
        id: "forum:access",
        label: "Fórum Clínico & Comunicados",
        description: "Participar de discussões técnicas e avisos da clínica",
        module: "team",
      },
    ],
  },
];

export const ALL_PERMISSIONS: PermissionItem[] = PERMISSION_GROUPS.flatMap((g) => g.permissions);

// ── Presets Rápidos com 1 Clique ──────────────────────────────────────────────

export const PRESETS = {
  THERAPIST: [
    "patients:view",
    "sessions:record",
    "sessions:view",
    "pei:view",
    "agenda:view",
    "reports:view",
    "forum:access",
  ] as PermissionSlug[],

  SUPERVISOR: [
    "patients:view",
    "patients:manage",
    "patients:pep",
    "sessions:record",
    "sessions:view",
    "approvals:manage",
    "pei:view",
    "pei:manage",
    "agenda:view",
    "agenda:manage",
    "hours:view",
    "financial:view",
    "reports:view",
    "reports:export",
    "team:view",
    "forum:access",
  ] as PermissionSlug[],

  FINANCIAL_ADMIN: [
    "patients:view",
    "agenda:view",
    "agenda:manage",
    "financial:view",
    "financial:manage",
    "reports:view",
    "forum:access",
  ] as PermissionSlug[],

  MASTER: ALL_PERMISSIONS.map((p) => p.id),
};

// ── Utilitários de Verificação de Permissão ───────────────────────────────────

export interface UserPermissionContext {
  role?: string;
  is_master?: number;
  permissions?: string[] | string | null;
}

/**
 * Converte string JSON ou array de permissões em string[] limpa
 */
export function normalizePermissions(
  raw: string[] | string | null | undefined,
  role?: string,
  isMaster?: number,
): string[] {
  if (isMaster === 1) {
    return ["*"];
  }

  if (Array.isArray(raw)) {
    return raw;
  }

  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Formato CSV simples fallback
      return raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  // Fallback se nulo: aplica o preset padrão do papel
  if (role === "admin") {
    return [...PRESETS.SUPERVISOR];
  }
  if (role === "therapist") {
    return [...PRESETS.THERAPIST];
  }
  return [];
}

/**
 * Verifica se um usuário possui uma permissão específica
 */
export function hasPermission(
  user: UserPermissionContext | null | undefined,
  permission: string,
): boolean {
  if (!user) return false;

  // Master tem bypass irrestrito
  if (user.is_master === 1) return true;

  const perms = normalizePermissions(user.permissions, user.role, user.is_master);

  // Wildcard global
  if (perms.includes("*")) return true;

  // Permissão exata
  if (perms.includes(permission)) return true;

  // Permissão por módulo wildcard (ex: 'patients:*' cobre 'patients:view')
  const [modulePrefix] = permission.split(":");
  if (modulePrefix && perms.includes(`${modulePrefix}:*`)) return true;

  return false;
}

