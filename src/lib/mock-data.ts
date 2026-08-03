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
