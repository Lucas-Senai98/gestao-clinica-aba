/**
 * src/lib/pep-constants.ts
 * Constantes clínicas do PEP — baseadas nos documentos oficiais da GiZé's.
 */

// ── Checklist ABA — 8 Passos ──────────────────────────────────────────────────

export const CHECKLIST_STEPS = [
  {
    n: 1,
    label: "Descrição Observável",
    hint: "Descreva o comportamento sem rótulos subjetivos. Inclua início, meio e fim de forma topográfica.",
    placeholder: "Ex: A criança cai ao chão, grita e chuta os pés por 3 a 5 minutos ao receber a instrução...",
  },
  {
    n: 2,
    label: "Contexto",
    hint: "Mapeie as demandas, pessoas e condições físicas/ambientais onde o comportamento OCORRE e onde NÃO OCORRE.",
    placeholder: "OCORRE: durante tarefas de mesa com demandas acadêmicas, com terapeuta nova.\nNÃO OCORRE: em atividades de livre acesso a brinquedos...",
  },
  {
    n: 3,
    label: "Padrão de Repetição",
    hint: "Identifique a frequência, o padrão de previsibilidade e as variáveis que aumentam ou diminuem o comportamento.",
    placeholder: "Frequência: 3 a 5 x por sessão. Aumenta quando a demanda é nova ou há pouca clareza na instrução...",
  },
  {
    n: 4,
    label: "Hipótese Inicial",
    hint: "Qual a função provável? Fuga de demanda, busca por atenção, regulação sensorial ou acesso a tangível?",
    placeholder: "Hipótese primária: Fuga de demanda. Hipótese secundária: Regulação sensorial por baixa tolerância à frustração...",
  },
  {
    n: 5,
    label: "Falhas no Repertório",
    hint: "Quais habilidades de desenvolvimento estão frágeis ou ausentes e precisam ser ensinadas como alternativas?",
    placeholder: "Ausência de mando funcional para 'pausa', baixa tolerância ao atraso de reforço, déficit em autorregulação...",
  },
  {
    n: 6,
    label: "Prioridade Clínica",
    hint: "Defina APENAS UMA prioridade baseada em impacto funcional, frequência e viabilidade de ensino.",
    placeholder: "Prioridade: Ensinar o mando 'pausa' como alternativa funcional à fuga via comportamento-problema...",
  },
  {
    n: 7,
    label: "Primeiras Ações",
    hint: "Quais intervenções diretas estão alinhadas com a hipótese levantada? Seja específico e operacional.",
    placeholder: "1. Implementar NCR de atenção a cada 2 min para reduzir a privação.\n2. Ensinar mando 'pausa' com suporte físico...",
  },
  {
    n: 8,
    label: "O que Evitar Ainda",
    hint: "Liste erros comuns a evitar, como extinção sem base sólida ou metas irrealistas para o nível atual.",
    placeholder: "Evitar: extinção do comportamento sem DRA instalada. Não iniciar procedimento de ignorar sem suporte da família...",
  },
] as const;

// ── Repertório Inicial — 5 Categorias + Skills ────────────────────────────────

export const REPERTOIRE_TEMPLATE: Record<string, string[]> = {
  "Atenção": [
    "Sentar em cadeira por tempo determinado",
    "Esperar pelo reforçador (tolerância à espera)",
    "Contato visual sob instrução",
  ],
  "Imitação": [
    "Imitar movimentos motores grossos",
    "Imitar movimentos motores finos",
    "Imitar ações com objetos",
    "Imitar movimentos fonoarticulatórios",
    "Imitar movimentos em pé",
    "Imitar sequências de movimentos",
  ],
  "Linguagem Receptiva": [
    "Seguir instrução simples (1 passo)",
    "Identificar partes do corpo",
    "Identificar pessoas do convívio",
    "Identificar objetos concretos",
    "Identificar figuras",
  ],
  "Linguagem Expressiva": [
    "Apontar para objetos/figuras desejados",
    "Produzir sons espontaneamente",
    "Imitar sons e sílabas",
    "Fazer pedidos vocais (mando)",
    "Nomear objetos",
    "Nomear figuras",
    "Nomear pessoas",
  ],
  "Pré-Acadêmicas": [
    "Coordenação olho-mão (encaixe, torre)",
    "Emparelhar objetos idênticos",
    "Emparelhar figuras idênticas",
    "Usar lápis (rabisco espontâneo)",
    "Usar tesoura (cortar papel)",
  ],
};

export type SkillLevel = "Sem Entrada" | "Em Aquisição" | "Adquirido" | "Em manutenção";

export const SKILL_LEVELS: SkillLevel[] = [
  "Sem Entrada", "Em Aquisição", "Adquirido", "Em manutenção",
];

// ── Reforçadores — 10 Categorias de Comunicação ──────────────────────────────

export const REINFORCER_CATEGORIES = [
  "Alimento", "Brinquedo", "Sensorial", "Auditivo",
  "Visual", "Social", "Motor", "Tangível", "Eletrônico", "Outro",
] as const;

// ── Estereotipias — Categorias ────────────────────────────────────────────────

export const STEREOTYPY_CATEGORIES = [
  "Movimento corporal repetitivo",
  "Autoestimulação vocal",
  "Fixação visual",
  "Autoestimulação tátil",
  "Autoestimulação olfativa/gustativa",
  "Outra",
] as const;
