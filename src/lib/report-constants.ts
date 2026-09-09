/**
 * src/lib/report-constants.ts
 * Templates oficiais de relatórios clínicos para a equipe.
 */

export interface ReportTemplate {
  id: string;
  name: string;
  scope: string;
  pages: number;
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: "rt1", name: "Relatório trimestral de evolução", scope: "Família + convênio", pages: 6 },
  { id: "rt2", name: "Devolutiva de avaliação inicial", scope: "Família", pages: 8 },
  { id: "rt3", name: "Relatório para escola", scope: "Instituição de ensino", pages: 3 },
  { id: "rt4", name: "Parecer para convênio / plano de saúde", scope: "Operadora", pages: 4 },
];
