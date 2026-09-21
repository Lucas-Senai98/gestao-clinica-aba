import assert from "assert";

async function run() {
  console.log("=================================================================");
  console.log("🧪 SUÍTE DE TESTES AUTOMATIZADOS: RELATÓRIOS CLÍNICOS E PDF");
  console.log("=================================================================\n");

  // 1. Importa as queries de relatórios
  console.log("▶ [1/6] Importando Server Functions de Relatórios Clínicos...");
  const {
    getClinicalReports,
    createClinicalReport,
    updateClinicalReport,
    toggleShareClinicalReport,
    deleteClinicalReport,
    DEV_CLINICAL_REPORTS,
  } = await import("../src/queries/reports.ts");

  console.log(`✅ Módulo carregado com sucesso. Relatórios em memória inicial: ${DEV_CLINICAL_REPORTS.length}`);
  assert(DEV_CLINICAL_REPORTS.length >= 2, "Deveria haver pelo menos 2 relatórios no seed dev");

  // 2. Testar listagem geral (equipe técnica)
  console.log("\n▶ [2/6] Testando getClinicalReports para equipe técnica...");
  const initialReports = await getClinicalReports({ data: {} });
  console.log(`✅ Relatórios retornados: ${initialReports.length}`);
  assert(initialReports.length >= 2, "Equipe técnica deve visualizar todos os relatórios");

  // 3. Testar criação e persistência de Rascunho ("Salvar rascunho")
  console.log("\n▶ [3/6] Testando persistência de NOVO RASCUNHO (createClinicalReport)...");
  const draftContent = `RELATÓRIO CLÍNICO LIVRE - MODELO EM BRANCO

Paciente: Lucas Almeida
Diagnóstico: TEA Nível 2
Responsável: Mariana Almeida
Data: 21/09/2026

Síntese Clínica:
Paciente participou ativamente das sessões de treino de comunicação funcional (FCT).
Houve avanço expressivo no repertório de mandos vocais e redução de barreiras comportamentais.`;

  const createRes = await createClinicalReport({
    data: {
      patientId: "p1",
      templateId: "blank",
      templateName: "Modelo em branco",
      title: "Modelo em branco — Lucas Almeida",
      content: draftContent,
      status: "Rascunho",
      sharedWithPatient: false,
    },
  });

  console.log(`✅ Rascunho salvo com sucesso! ID gerado: ${createRes.id}`);
  assert(createRes.id, "ID do relatório deve ser retornado");

  // Verifica se o rascunho aparece na listagem
  const afterSaveList = await getClinicalReports({ data: {} });
  const savedDraft = afterSaveList.find((r) => r.id === createRes.id);
  assert(savedDraft, "O rascunho recém-criado DEVE estar na listagem");
  assert.strictEqual(savedDraft.status, "Rascunho", "Status deve ser 'Rascunho'");
  assert.strictEqual(savedDraft.sharedWithPatient, false, "Rascunho não deve estar compartilhado ainda");
  assert(savedDraft.content.includes("comunicação funcional"), "Conteúdo deve bater exatamente com o texto editado");
  console.log(`✅ Verificação de persistência do rascunho: PASSOU (Título: "${savedDraft.title}")`);

  // 4. Testar edição do rascunho (updateClinicalReport)
  console.log("\n▶ [4/6] Testando atualização e edição do rascunho existente...");
  const updatedContent = draftContent + "\n\nObservação adicional da supervisora: Continuar com a carga de 8h semanais.";
  await updateClinicalReport({
    data: {
      id: createRes.id,
      title: "Relatório de Evolução Revisado — Lucas Almeida",
      content: updatedContent,
      status: "Rascunho",
    },
  });

  const afterUpdateList = await getClinicalReports({ data: {} });
  const updatedReport = afterUpdateList.find((r) => r.id === createRes.id);
  assert(updatedReport, "Relatório atualizado deve existir");
  assert.strictEqual(updatedReport.title, "Relatório de Evolução Revisado — Lucas Almeida");
  assert(updatedReport.content.includes("Observação adicional da supervisora"), "Conteúdo atualizado deve estar salvo");
  console.log(`✅ Verificação de atualização: PASSOU (Novo título: "${updatedReport.title}")`);

  // 5. Testar envio do relatório para o paciente / família
  console.log("\n▶ [5/6] Testando envio e compartilhamento com a família (toggleShareClinicalReport)...");
  const shareRes = await toggleShareClinicalReport({
    data: {
      id: createRes.id,
      sharedWithPatient: true,
    },
  });
  assert.strictEqual(shareRes.sharedWithPatient, true, "sharedWithPatient deve ser true");

  const afterShareList = await getClinicalReports({ data: {} });
  const sharedItem = afterShareList.find((r) => r.id === createRes.id);
  assert(sharedItem.sharedWithPatient === true, "sharedWithPatient deve ser true");
  assert.strictEqual(sharedItem.status, "Emitido", "Ao compartilhar com a família, status deve ser promovido a Emitido");
  console.log(`✅ Relatório compartilhado com a família com sucesso! (Status: ${sharedItem.status}, Shared: ${sharedItem.sharedWithPatient})`);

  // Testar exclusão (deleteClinicalReport)
  console.log("\n▶ [6/6] Testando exclusão do relatório de teste...");
  await deleteClinicalReport({ data: { id: createRes.id } });
  const finalList = await getClinicalReports({ data: {} });
  assert(!finalList.some((r) => r.id === createRes.id), "Relatório excluído não deve mais aparecer");
  console.log(`✅ Exclusão verificada: PASSOU`);

  console.log("\n=================================================================");
  console.log("🎉 TODOS OS 6 TESTES DE INTEGRAÇÃO PASSARAM COM 100% DE SUCESSO!");
  console.log("=================================================================");
}

run().catch((err) => {
  console.error("❌ Erro nos testes:", err);
  process.exit(1);
});

