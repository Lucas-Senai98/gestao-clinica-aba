// Centralized mock data for the entire ABA platform.
export type Role = "admin" | "therapist" | "parent";

export const therapists = [
  { id: "t1", name: "Ana Beatriz Lopes", role: "Terapeuta ABA", avatar: "AB" },
  { id: "t2", name: "Carla Mendes", role: "Fonoaudióloga", avatar: "CM" },
  { id: "t3", name: "Diego Ramos", role: "Psicólogo", avatar: "DR" },
  { id: "t4", name: "Fernanda Souza", role: "Terapeuta Ocupacional", avatar: "FS" },
];

export const patients = [
  {
    id: "p1",
    name: "Lucas Almeida",
    age: 5,
    diagnosis: "TEA Nível 2",
    guardian: "Mariana Almeida",
    avatar: "LA",
    nextSession: "Hoje, 14:00",
    therapistId: "t1",
    progress: 78,
  },
  {
    id: "p2",
    name: "Sofia Pereira",
    age: 4,
    diagnosis: "TEA Nível 1",
    guardian: "Rafael Pereira",
    avatar: "SP",
    nextSession: "Hoje, 15:30",
    therapistId: "t1",
    progress: 64,
  },
  {
    id: "p3",
    name: "Bento Oliveira",
    age: 6,
    diagnosis: "TEA Nível 2 + TDAH",
    guardian: "Juliana Oliveira",
    avatar: "BO",
    nextSession: "Amanhã, 10:00",
    therapistId: "t1",
    progress: 52,
  },
  {
    id: "p4",
    name: "Helena Costa",
    age: 3,
    diagnosis: "Atraso de linguagem",
    guardian: "Pedro Costa",
    avatar: "HC",
    nextSession: "Quinta, 09:00",
    therapistId: "t2",
    progress: 81,
  },
];

export const repertoire = {
  Atenção: [
    { skill: "Mantém contato visual por 3s", level: "Adquirido", start: "10/02/25", end: "22/03/25" },
    { skill: "Atenção compartilhada", level: "Em aquisição", start: "01/04/25", end: "—" },
    { skill: "Resposta ao nome", level: "Adquirido", start: "10/02/25", end: "28/02/25" },
  ],
  Imitação: [
    { skill: "Imita motor grosso", level: "Adquirido", start: "10/02/25", end: "15/03/25" },
    { skill: "Imita motor fino", level: "Em aquisição", start: "20/03/25", end: "—" },
    { skill: "Imita vocal simples", level: "Em aquisição", start: "01/04/25", end: "—" },
  ],
  "Linguagem Receptiva": [
    { skill: "Segue 1 instrução simples", level: "Adquirido", start: "10/02/25", end: "10/03/25" },
    { skill: "Identifica objetos comuns", level: "Em aquisição", start: "15/03/25", end: "—" },
  ],
  "Linguagem Expressiva": [
    { skill: "Solicita reforçador (mando)", level: "Em aquisição", start: "01/03/25", end: "—" },
    { skill: "Nomeia 10 figuras (tato)", level: "Não iniciado", start: "—", end: "—" },
  ],
  "Pré-Acadêmicas": [
    { skill: "Pareamento de cores", level: "Adquirido", start: "10/02/25", end: "05/03/25" },
    { skill: "Conta até 5", level: "Em aquisição", start: "10/03/25", end: "—" },
  ],
};

export const reinforcers = [
  { item: "Bolhas de sabão", category: "Sensorial", preference: "Alta" },
  { item: "Carrinho azul", category: "Brinquedo", preference: "Alta" },
  { item: "Música infantil", category: "Auditivo", preference: "Média" },
  { item: "Biscoito recheado", category: "Comestível", preference: "Alta" },
  { item: "Elogio + palmas", category: "Social", preference: "Média" },
];

export const stereotypies = [
  {
    category: "Motora",
    topography: "Bater palmas repetidamente",
    frequency: "Alta",
    intensity: "Moderada",
    context: "Ao ouvir música",
    function: "Auto-regulação sensorial",
  },
  {
    category: "Vocal",
    topography: "Repetição de palavras (ecolalia)",
    frequency: "Média",
    intensity: "Leve",
    context: "Durante transições",
    function: "Auto-estimulação / fuga",
  },
  {
    category: "Visual",
    topography: "Observar luzes piscando",
    frequency: "Baixa",
    intensity: "Leve",
    context: "Ambiente novo",
    function: "Estimulação visual",
  },
];

export const clinicalChecklist = {
  description:
    "Paciente apresenta dificuldade em iniciar atividades estruturadas, recusa-se com choro e tentativa de fuga da mesa.",
  context: "Demandas acadêmicas após período de brincadeira livre. Presença da mãe na sala.",
  pattern: "Choro escalonado seguido de jogar materiais no chão. Duração média 4–6 min.",
  hypothesis: "Função primária: fuga de demanda. Função secundária: atenção do adulto.",
  missing: "Tolerância a demanda, comunicação funcional para pedir pausa, repertório de espera.",
  priority: "Alta — comportamento interfere em 60% das sessões.",
};

// Sessions over a month (day -> %)
export const monthlyPerformance = Array.from({ length: 22 }, (_, i) => ({
  day: `${(i + 1).toString().padStart(2, "0")}/05`,
  percent: 45 + Math.round(Math.sin(i / 2) * 12) + i * 1.5,
}));

export const yesNoByTarget = [
  { target: "Pareamento", yes: 18, no: 4 },
  { target: "Imitação motora", yes: 22, no: 6 },
  { target: "Mando", yes: 14, no: 9 },
  { target: "Tato", yes: 11, no: 12 },
  { target: "Atenção", yes: 20, no: 3 },
  { target: "Receptiva", yes: 16, no: 7 },
];

export const intensityFrequency = Array.from({ length: 20 }, (_, i) => {
  const intensities = ["Leve", "Moderada", "Intensa"] as const;
  const intensity = intensities[i % 3];
  return {
    day: `${(i + 1).toString().padStart(2, "0")}/05`,
    minutes: 3 + ((i * 7) % 18),
    intensity,
  };
});

export const parentFeed = [
  {
    id: "f1",
    date: "Hoje • 16:20",
    therapist: "Ana Beatriz",
    title: "Sessão de hoje foi ótima!",
    body: "Lucas conseguiu ficar atento à atividade de pareamento por 8 minutos seguidos — recorde da semana! Comeu o lanche sem recusa e pediu mais bolhas usando palavras. Em casa, vale praticar pedir 'mais' antes de entregar o brinquedo favorito.",
    mood: "ótimo",
  },
  {
    id: "f2",
    date: "Ontem • 17:05",
    therapist: "Ana Beatriz",
    title: "Dia tranquilo",
    body: "Hoje trabalhamos imitação e respostas ao nome. Lucas participou bem da maior parte das atividades. Teve um momento de cansaço perto do fim, e fizemos uma pausa com música, o que ajudou muito.",
    mood: "bom",
  },
  {
    id: "f3",
    date: "Seg • 16:00",
    therapist: "Carla Mendes",
    title: "Avanço na comunicação",
    body: "Pela primeira vez Lucas pediu água espontaneamente! Foi um marco importante. Vamos reforçar isso nos próximos dias.",
    mood: "ótimo",
  },
];

export const announcements = [
  {
    id: "a1",
    title: "Recesso — Feriado de Corpus Christi",
    body: "A clínica estará fechada na quinta (29/05) e sexta (30/05). Sessões serão remarcadas.",
    date: "20/05/25",
  },
  {
    id: "a2",
    title: "Reunião de pais",
    body: "Próximo encontro do grupo de pais será 05/06 às 19h, online. Link enviado por e-mail.",
    date: "18/05/25",
  },
];

export const adminStats = {
  patients: 42,
  therapists: 11,
  pendingApprovals: 6,
  sessionsThisWeek: 138,
};

export const therapistHours = [
  { therapist: "Ana Beatriz Lopes", date: "27/05", sessions: 5, hours: 5.5 },
  { therapist: "Ana Beatriz Lopes", date: "26/05", sessions: 6, hours: 6.0 },
  { therapist: "Carla Mendes", date: "27/05", sessions: 4, hours: 4.0 },
  { therapist: "Diego Ramos", date: "27/05", sessions: 5, hours: 5.0 },
  { therapist: "Fernanda Souza", date: "27/05", sessions: 3, hours: 3.5 },
  { therapist: "Carla Mendes", date: "26/05", sessions: 5, hours: 5.0 },
  { therapist: "Diego Ramos", date: "26/05", sessions: 4, hours: 4.0 },
];

export const forumThreads = [
  {
    id: "th1",
    title: "Manejo de fuga de demanda — caso Lucas A.",
    author: "Ana Beatriz",
    avatar: "AB",
    when: "2h",
    replies: 4,
    preview:
      "Estou observando aumento na frequência de fuga durante atividades de mesa. Já tentei reduzir demanda e usar token board...",
  },
  {
    id: "th2",
    title: "Reunião semanal — alinhamento de metas Q2",
    author: "Supervisão",
    avatar: "SV",
    when: "Ontem",
    replies: 12,
    preview: "Pessoal, vamos revisar as metas dos PEIs antes da reunião de sexta. Anexei o template atualizado.",
  },
  {
    id: "th3",
    title: "Dúvida sobre coleta de dados em ambiente naturalista",
    author: "Diego Ramos",
    avatar: "DR",
    when: "2d",
    replies: 7,
    preview: "Alguém tem sugestão de planilha simplificada para registro no parquinho?",
  },
];

export const appointments = [
  { id: "s1", time: "08:00", patient: "Helena Costa", therapist: "Carla Mendes", room: "Sala 1", type: "Fonoaudiologia", status: "Concluída" },
  { id: "s2", time: "09:00", patient: "Bento Oliveira", therapist: "Diego Ramos", room: "Sala 3", type: "Psicologia", status: "Concluída" },
  { id: "s3", time: "10:00", patient: "Lucas Almeida", therapist: "Ana Beatriz Lopes", room: "Sala 2", type: "ABA Intensivo", status: "Em andamento" },
  { id: "s4", time: "11:00", patient: "Sofia Pereira", therapist: "Fernanda Souza", room: "Sala T.O.", type: "Terapia Ocupacional", status: "Agendada" },
  { id: "s5", time: "14:00", patient: "Lucas Almeida", therapist: "Ana Beatriz Lopes", room: "Sala 2", type: "ABA Intensivo", status: "Agendada" },
  { id: "s6", time: "15:30", patient: "Sofia Pereira", therapist: "Ana Beatriz Lopes", room: "Sala 2", type: "ABA Intensivo", status: "Agendada" },
  { id: "s7", time: "16:30", patient: "Bento Oliveira", therapist: "Carla Mendes", room: "Sala 1", type: "Fonoaudiologia", status: "Agendada" },
  { id: "s8", time: "17:30", patient: "Helena Costa", therapist: "Diego Ramos", room: "Sala 3", type: "Psicologia", status: "Cancelada" },
];

export const weekDays = ["Seg 25", "Ter 26", "Qua 27", "Qui 28", "Sex 29"];

// ---- Módulo PEI (Plano de Ensino Individualizado) ----
export type PeiStatus = "Em andamento" | "Atingida" | "Suspensa";

export const peiGoals = [
  {
    id: "g1",
    area: "Comunicação",
    goal: "Solicitar 10 itens preferidos com fala funcional",
    criteria: "80% de acerto em 3 sessões consecutivas",
    baseline: 20,
    current: 62,
    target: 80,
    status: "Em andamento" as PeiStatus,
    responsible: "Ana Beatriz Lopes",
    review: "15/06/25",
  },
  {
    id: "g2",
    area: "Habilidades Sociais",
    goal: "Aguardar a vez em jogo de turnos por 3 rodadas",
    criteria: "3 rodadas sem suporte físico",
    baseline: 10,
    current: 45,
    target: 75,
    status: "Em andamento" as PeiStatus,
    responsible: "Diego Ramos",
    review: "10/06/25",
  },
  {
    id: "g3",
    area: "Autonomia",
    goal: "Lavar as mãos com encadeamento completo",
    criteria: "Independência em 5 tentativas",
    baseline: 30,
    current: 90,
    target: 85,
    status: "Atingida" as PeiStatus,
    responsible: "Fernanda Souza",
    review: "Concluída em 28/04/25",
  },
  {
    id: "g4",
    area: "Pré-Acadêmicas",
    goal: "Identificar números de 1 a 10",
    criteria: "90% de acerto em 2 sessões",
    baseline: 15,
    current: 38,
    target: 90,
    status: "Em andamento" as PeiStatus,
    responsible: "Ana Beatriz Lopes",
    review: "20/06/25",
  },
  {
    id: "g5",
    area: "Comportamento",
    goal: "Reduzir fuga de demanda para até 2 episódios/sessão",
    criteria: "Média semanal ≤ 2 episódios",
    baseline: 70,
    current: 55,
    target: 30,
    status: "Suspensa" as PeiStatus,
    responsible: "Supervisão",
    review: "Reavaliar protocolo",
  },
];

export const peiHistory = [
  { date: "02/05/25", author: "Ana Beatriz", note: "Aumentado critério de mando para 10 itens." },
  { date: "18/04/25", author: "Supervisão", note: "Meta de autonomia atingida — generalização para casa." },
  { date: "05/04/25", author: "Diego Ramos", note: "Inserida meta de turnos com pares." },
];

// ---- Módulo Aprovações (Admin) ----
export const pendingApprovals = [
  { id: "ap1", type: "Folha de sessão", detail: "Lucas Almeida — 27/05 14:00", requester: "Ana Beatriz Lopes", when: "há 20 min", priority: "Alta" },
  { id: "ap2", type: "Alteração de PEI", detail: "Sofia Pereira — nova meta de tato", requester: "Ana Beatriz Lopes", when: "há 2 h", priority: "Média" },
  { id: "ap3", type: "Remarcação", detail: "Bento Oliveira — mover para Qui 09:00", requester: "Diego Ramos", when: "há 3 h", priority: "Média" },
  { id: "ap4", type: "Horas extras", detail: "Carla Mendes — +2h em 26/05", requester: "Carla Mendes", when: "ontem", priority: "Baixa" },
  { id: "ap5", type: "Relatório trimestral", detail: "Helena Costa — devolutiva família", requester: "Fernanda Souza", when: "ontem", priority: "Alta" },
  { id: "ap6", type: "Novo paciente", detail: "Cadastro: Miguel Tavares (3a)", requester: "Recepção", when: "2 dias", priority: "Alta" },
];

// ---- Módulo Relatórios ----
export const reportTemplates = [
  { id: "rt1", name: "Relatório trimestral de evolução", scope: "Família + convênio", pages: 6 },
  { id: "rt2", name: "Devolutiva de avaliação inicial", scope: "Família", pages: 8 },
  { id: "rt3", name: "Relatório para escola", scope: "Instituição de ensino", pages: 3 },
  { id: "rt4", name: "Parecer para convênio / plano de saúde", scope: "Operadora", pages: 4 },
];

export const generatedReports = [
  { id: "gr1", patient: "Lucas Almeida", template: "Relatório trimestral de evolução", author: "Ana Beatriz Lopes", date: "26/05/25", status: "Aguardando assinatura" },
  { id: "gr2", patient: "Helena Costa", template: "Devolutiva de avaliação inicial", author: "Fernanda Souza", date: "22/05/25", status: "Enviado" },
  { id: "gr3", patient: "Sofia Pereira", template: "Relatório para escola", author: "Carla Mendes", date: "19/05/25", status: "Rascunho" },
  { id: "gr4", patient: "Bento Oliveira", template: "Parecer para convênio / plano de saúde", author: "Diego Ramos", date: "14/05/25", status: "Enviado" },
];

// ---- Portal dos pais: agenda e presença ----
export const parentSchedule = [
  { id: "ps1", day: "Hoje", date: "27/05", time: "14:00", type: "ABA Intensivo", therapist: "Ana Beatriz Lopes", status: "Confirmada" },
  { id: "ps2", day: "Quarta", date: "28/05", time: "10:00", type: "Fonoaudiologia", therapist: "Carla Mendes", status: "Confirmada" },
  { id: "ps3", day: "Quinta", date: "29/05", time: "—", type: "Recesso — Corpus Christi", therapist: "—", status: "Cancelada" },
  { id: "ps4", day: "Segunda", date: "02/06", time: "14:00", type: "ABA Intensivo", therapist: "Ana Beatriz Lopes", status: "Agendada" },
  { id: "ps5", day: "Terça", date: "03/06", time: "09:00", type: "Terapia Ocupacional", therapist: "Fernanda Souza", status: "Agendada" },
];

export const parentAttendance = { presencas: 18, faltas: 2, remarcadas: 3, mes: "Maio/2025" };

export const homePractices = [
  { id: "hp1", title: "Pedir 'mais' antes de entregar o brinquedo", freq: "3x ao dia", done: true },
  { id: "hp2", title: "Nomear 3 figuras no livro à noite", freq: "1x ao dia", done: false },
  { id: "hp3", title: "Lavar as mãos com apoio verbal apenas", freq: "Antes das refeições", done: true },
];

// ---- Módulo Equipe (Admin) ----
export const teamMembers = [
  { id: "tm1", name: "Ana Beatriz Lopes", avatar: "AB", role: "Terapeuta ABA", registry: "CRP 06/12345", caseload: 8, weeklyHours: 32, status: "Ativa", email: "ana.lopes@gizeclinica.com.br" },
  { id: "tm2", name: "Carla Mendes", avatar: "CM", role: "Fonoaudióloga", registry: "CRFa 2-98765", caseload: 6, weeklyHours: 24, status: "Ativa", email: "carla.mendes@gizeclinica.com.br" },
  { id: "tm3", name: "Diego Ramos", avatar: "DR", role: "Psicólogo", registry: "CRP 06/54321", caseload: 7, weeklyHours: 30, status: "Ativa", email: "diego.ramos@gizeclinica.com.br" },
  { id: "tm4", name: "Fernanda Souza", avatar: "FS", role: "Terapeuta Ocupacional", registry: "CREFITO 3/11223", caseload: 5, weeklyHours: 20, status: "Férias", email: "fernanda.souza@gizeclinica.com.br" },
  { id: "tm5", name: "Marina Duarte", avatar: "MD", role: "Supervisora Clínica", registry: "CRP 06/77889", caseload: 3, weeklyHours: 36, status: "Ativa", email: "marina.duarte@gizeclinica.com.br" },
  { id: "tm6", name: "Rafael Nunes", avatar: "RN", role: "Aplicador ABA", registry: "Em formação", caseload: 4, weeklyHours: 18, status: "Inativo", email: "rafael.nunes@gizeclinica.com.br" },
];

export const teamCertifications = [
  { member: "Ana Beatriz Lopes", cert: "Supervisão em ABA (400h)", validity: "12/2026" },
  { member: "Carla Mendes", cert: "PECS Nível 1", validity: "08/2026" },
  { member: "Diego Ramos", cert: "Denver Model", validity: "03/2027" },
  { member: "Fernanda Souza", cert: "Integração Sensorial", validity: "11/2025" },
];

// ---- Notificações ----
export const notifications = [
  { id: "n1", title: "Folha de sessão pendente", body: "Lucas Almeida — sessão de 27/05 às 14:00 sem registro.", when: "há 15 min", kind: "alerta", read: false },
  { id: "n2", title: "PEI revisado pela supervisão", body: "Meta de comunicação de Sofia Pereira aprovada.", when: "há 2 h", kind: "info", read: false },
  { id: "n3", title: "Nova mensagem no fórum", body: "Carla Mendes respondeu em 'Manejo de fuga de demanda'.", when: "há 3 h", kind: "info", read: true },
  { id: "n4", title: "Relatório aguardando assinatura", body: "Relatório trimestral de Lucas Almeida.", when: "ontem", kind: "alerta", read: true },
  { id: "n5", title: "Recesso agendado", body: "Clínica fechada em 29 e 30/05.", when: "2 dias", kind: "aviso", read: true },
];
