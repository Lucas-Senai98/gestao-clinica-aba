/**
 * src/lib/report-constants.ts
 * Templates oficiais de relatórios clínicos para a equipe.
 */

export interface ReportTemplate {
  id: string;
  name: string;
  scope: string;
  pages: number;
  description?: string;
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: "rt1",
    name: "Relatório trimestral de evolução",
    scope: "Família + convênio",
    pages: 6,
    description: "Acompanhamento detalhado de marcos, programas e evolução clínica.",
  },
  {
    id: "rt2",
    name: "Devolutiva de avaliação inicial",
    scope: "Família",
    pages: 8,
    description: "Síntese dos protocolos VB-MAPP / ABLLS e proposta terapêutica.",
  },
  {
    id: "rt3",
    name: "Relatório para escola",
    scope: "Instituição de ensino",
    pages: 3,
    description: "Diretrizes de mediação escolar, adaptação de rotina e condutas.",
  },
  {
    id: "rt4",
    name: "Parecer para convênio / plano de saúde",
    scope: "Operadora",
    pages: 4,
    description: "Justificativa técnica de carga horária e necessidade terapêutica.",
  },
  {
    id: "blank",
    name: "Modelo em branco",
    scope: "Livre / Personalizado",
    pages: 1,
    description: "Documento livre sem estrutura pré-definida para redação personalizada.",
  },
];

export function getReportDefaultContent(
  templateId: string,
  patient?: { name?: string; diagnosis?: string; guardian?: string } | null
): string {
  const patientName = patient?.name || "Nome do Paciente";
  const diagnosis = patient?.diagnosis || "Não informado";
  const guardian = patient?.guardian || "Não informado";
  const today = new Date().toLocaleDateString("pt-BR");

  switch (templateId) {
    case "blank":
      return [
        "RELATÓRIO CLÍNICO LIVRE",
        "",
        `Paciente: ${patientName}`,
        `Diagnóstico / Hipótese: ${diagnosis}`,
        `Responsável: ${guardian}`,
        `Data: ${today}`,
        "",
        "--------------------------------------------------",
        "",
        "[Digite ou cole aqui o conteúdo do relatório clínico...]",
      ].join("\n");

    case "rt1":
      return [
        "RELATÓRIO TRIMESTRAL DE EVOLUÇÃO CLÍNICA ABA",
        "",
        "1. IDENTIFICAÇÃO DO PACIENTE",
        `Paciente: ${patientName}`,
        `Diagnóstico / Hipótese: ${diagnosis}`,
        `Responsável: ${guardian}`,
        `Data de Emissão: ${today}`,
        `Período de Referência: Trimestre Atual`,
        "",
        "2. OBJETIVOS E METAS TERAPÊUTICAS",
        "- Expansão do repertório de comunicação funcional (mando e tato).",
        "- Fortalecimento de habilidades sociais e engajamento em brincadeiras cooperativas.",
        "- Redução de comportamentos interferentes que limitam o aprendizado.",
        "- Aumento da autonomia nas atividades de vida diária (AVDs).",
        "",
        "3. DESEMPENHO POR ÁREA DE DOMÍNIO",
        "- Atenção Compartilhada e Contato Visual: Desempenho satisfatório (85% de independência).",
        "- Linguagem Receptiva / Instruções: Responde com consistência a comandos de múltiplos passos.",
        "- Linguagem Expressiva / Comunicação: Aumento expressivo no uso espontâneo de sentenças de 2 a 3 palavras.",
        "- Habilidades Motoras e Imitação: Boa adesão a modelos motores grossos e finos.",
        "",
        "4. ANÁLISE DE COMPORTAMENTOS INTERFERENTES",
        "- Foram observadas reduções consistentes na frequência de crises de frustração após a introdução de suportes visuais e treino de comunicação funcional (FCT).",
        "- Média de episódios semanais caiu de 12 para 3 no período avaliado.",
        "",
        "5. RECOMENDAÇÕES E ORIENTAÇÕES",
        "- Família: Manter rotina visual estruturada em ambiente domiciliar e reforçar a comunicação funcional.",
        "- Escola: Facilitar intervalos sensoriais e manter contato contínuo com a equipe multidisciplinar.",
        "- Continuidade do PTI: Recomenda-se a continuidade da intervenção na carga horária prescrita.",
      ].join("\n");

    case "rt2":
      return [
        "DEVOLUTIVA DE AVALIAÇÃO INICIAL COMPORTAMENTAL (ABA)",
        "",
        "1. DADOS DE IDENTIFICAÇÃO",
        `Paciente: ${patientName}`,
        `Diagnóstico / Encaminhamento: ${diagnosis}`,
        `Responsável: ${guardian}`,
        `Data da Avaliação: ${today}`,
        "",
        "2. MOTIVO DA AVALIAÇÃO E HISTÓRICO",
        "Encaminhado para avaliação comportamental abrangente para identificar déficits e excessos comportamentais, visando à elaboração de um Plano Terapêutico Individualizado (PTI) em Análise do Comportamento Aplicada (ABA).",
        "",
        "3. PROTOCOLOS E INSTRUMENTOS UTILIZADOS",
        "- Avaliação comportamental direta por observação e sondagens clínicas.",
        "- Inventário de marcos de desenvolvimento (VB-MAPP / ABLLS-R).",
        "- Anamnese clínica e questionários funcionais com os responsáveis.",
        "",
        "4. SÍNTESE DOS ACHADOS CLÍNICOS",
        "- Barreiras de Aprendizado: Baixa tolerância à frustração diante da negativa e fuga de demandas estruturadas.",
        "- Comunicação e Linguagem: Comunicação verbal restrita; uso frequente de conduta motora (puxar pela mão) para solicitar itens.",
        "- Cooperação e Contato Social: Interação mediada pelo terapeuta com respostas graduais a reforçadores de alto interesse.",
        "",
        "5. PROPOSTA DE INTERVENÇÃO TERAPÊUTICA",
        "- Carga horária semanal sugerida: 15 a 20 horas de terapia intensiva.",
        "- Focos prioritários: Treino de comunicação funcional, emparelhamento de vínculos (pairing), tolerância e cooperação.",
        "- Previsão de reavaliação formal: 6 meses a contar do início do tratamento.",
      ].join("\n");

    case "rt3":
      return [
        "RELATÓRIO CLÍNICO PARA ORIENTAÇÃO ESCOLAR",
        "",
        "1. DADOS DO EDUCANDO",
        `Aluno(a): ${patientName}`,
        `Diagnóstico: ${diagnosis}`,
        `Responsável: ${guardian}`,
        `Data do Relatório: ${today}`,
        "",
        "2. OBJETIVO DAS DIRETRIZES",
        "Oferecer suporte técnico à equipe pedagógica e mediadores para promover a inclusão escolar, autonomia nas atividades pedagógicas e o bem-estar socioemocional do educando em ambiente de sala de aula.",
        "",
        "3. RECOMENDAÇÕES PEDAGÓGICAS E ESTRUTURAIS",
        "- Quadro de Rotina: Utilizar agenda visual com fotos ou pictogramas para antecipar as trocas de atividades.",
        "- Adaptação de Tarefas: Fracionar atividades longas em etapas menores com pausas programadas.",
        "- Pistas e Apoios: Utilizar dicas graduais (gestuais, visuais e verbais mínimas), evitando dependência de apoio físico.",
        "",
        "4. MANEJO COMPORTAMENTAL EM SALA",
        "- Identificar sinais precoces de cansaço ou sobrecarga sensorial.",
        "- Proporcionar 'cantinho da regulação' ou pausas estratégicas de 2 minutos.",
        "- Enfatizar o reforço social positivo contingente à cooperação e permanência na mesa.",
        "",
        "5. ARTICULAÇÃO COM A EQUIPE TERAPÊUTICA",
        "A equipe da clínica permanece disponível para reuniões periódicas de alinhamento com a coordenação e corpo docente.",
      ].join("\n");

    case "rt4":
      return [
        "PARECER TÉCNICO PARA OPERADORA DE SAÚDE / CONVÊNIO",
        "",
        "1. IDENTIFICAÇÃO DO BENEFICIÁRIO",
        `Beneficiário: ${patientName}`,
        `CID-10 / Hipótese Diagnóstica: ${diagnosis}`,
        `Responsável: ${guardian}`,
        `Data do Parecer: ${today}`,
        "",
        "2. JUSTIFICATIVA CLÍNICA DA NECESSIDADE TERAPÊUTICA",
        "O(A) beneficiário(a) apresenta Transtorno do Espectro Autista (TEA) com repercussões significativas no neurodesenvolvimento, requerendo intervenção comportamental intensiva fundamentada na Análise do Comportamento Aplicada (ABA), com ampla comprovação científica de eficácia.",
        "",
        "3. PLANO TERAPÊUTICO MULTIDISCIPLINAR E CARGA HORÁRIA SOLICITADA",
        "- Psicoterapia Comportamental / Terapia ABA: 12 horas semanais.",
        "- Fonoaudiologia Especializada em TEA e Linguagem: 2 horas semanais.",
        "- Terapia Ocupacional com Abordagem em Integração Sensorial: 2 horas semanais.",
        "- Supervisão Clínica e Reunião de Alinhamento Familiar: 2 horas mensais.",
        "",
        "4. CRITÉRIOS DE EVOLUÇÃO E MONITORAMENTO",
        "Os atendimentos seguem protocolos padronizados de registro contínuo de tentativas, garantindo mensuração objetiva de aquisição de habilidades e redução de comportamentos-alvo.",
        "",
        "5. CONCLUSÃO",
        "A manutenção integral da carga horária prescrita é imprescindível para prevenir perdas funcionais e assegurar o avanço no desenvolvimento neuropsicomotor.",
      ].join("\n");

    default:
      return [
        "RELATÓRIO CLÍNICO",
        "",
        `Paciente: ${patientName}`,
        `Diagnóstico: ${diagnosis}`,
        `Responsável: ${guardian}`,
        `Data: ${today}`,
        "",
        "Síntese clínica:",
        "Documento clínico editável. Insira as considerações clínicas necessárias.",
      ].join("\n");
  }
}
