# ABA Connect Pro

Crie o front-end completo de uma plataforma Web/PWA chamada "Sistema de Gestão Clínica ABA", focada em terapias integradas e ABA (Análise do Comportamento Aplicada). O back-end será feito separadamente, então construa o front-end utilizando React, Tailwind CSS, shadcn/ui para os componentes, Lucide React para ícones e Recharts para a visualização de dados. Crie dados mockados (mock data) detalhados para simular o funcionamento de todos os módulos.

Identidade Visual e Estilo: A estética deve ser profissional, limpa, acolhedora e acessível (estilo saúde/pediatria). A paleta de cores principal deve ser baseada em tons de lilás/roxo suave (referência à logomarca da Clínica GiZé's) combinada com fundos brancos e cinzas claros (zinc/slate). A responsividade é obrigatória: a interface dos terapeutas deve ser "mobile-first".

Módulo 1: Layout e Navegação Global

Crie uma barra de navegação lateral (Sidebar) para desktop e um menu inferior (Bottom Tab Bar) ou menu hambúrguer para mobile.

Simule um seletor de perfil no cabeçalho onde eu possa alternar entre as visões de "Administrador", "Terapeuta" e "Responsável/Pai".

Módulo 2: Visão do Terapeuta e Coleta de Dados (Foco Mobile)

Página Inicial do Terapeuta: Uma lista em formato de cards dos pacientes atribuídos a ele. Em cada card, um botão rápido: "Iniciar Sessão".

Formulário "Folha de Registro ABA (Diário)": Este é o coração do app e deve ser otimizado para preenchimento rápido pelo celular.

Cabeçalho: Nome do Paciente, Data, Horário e Duração.

Seção 1 - Comportamentos: Use switches/toggles ou botões de seleção rápida para: Cooperação (Sim/Não), Atenção à tarefa (Sim/Não), Respostas inadequadas (Sim/Não). Use radio groups visuais para: Transições (Fácil, Moderada, Difícil), Contato Visual (Adequado, Parcial, Ausente), Comunicação funcional (Adequada, Parcial, Ausente).

Seção 2 - Programas de Ensino: Uma lista dinâmica onde o terapeuta adiciona os "Alvos" do dia. Cada item da lista deve ter inputs numéricos lado a lado para "Tentativas" e "Acertos". Ao digitar, o sistema deve exibir automaticamente ao lado um badge com a porcentagem (%) de desempenho calculada.

Seção 3 e 4: Textareas para "Reforçadores Utilizados" e "Observações Gerais".

Módulo 3: Prontuário Eletrônico do Paciente (PEP)

Uma página de perfil do paciente contendo abas (Tabs) para organizar as avaliações.

Aba de Repertório Inicial: Tabelas expansíveis (Accordion) listando habilidades com colunas para Nível, Data de Início e Data de Término. Categorias: Habilidades de Atenção, Imitação, Linguagem Receptiva/Expressiva e Pré-Acadêmicas.

Aba de Reforçadores: Tabelas para registrar preferências. Inclua uma seção de "Padrões Autoestimulatórios" com colunas para Categoria, Topografia, Frequência, Intensidade, Contexto e Função Provável.

Aba Checklist Clínico ABA: Formulário com campos estruturados para: 1. Descrição do que está acontecendo, 2. Contexto (demandas, pessoas), 3. Padrão, 4. Hipótese Inicial (fuga, atenção, etc.), 5. O que falta no repertório e 6. Prioridade Clínica.

Módulo 4: Dashboard de Gráficos (Usando Recharts)

Crie uma página de "Evolução" no prontuário do paciente que exiba 3 tipos de gráficos dinâmicos substituindo antigas planilhas:

Gráfico de Desempenho Mensal: Um gráfico de linhas (LineChart) ou barras mostrando a porcentagem (%) de acertos nos programas ao longo dos dias do mês.

Gráfico Rápido Sim/Não: Um gráfico de barras empilhadas (Stacked Bar Chart) ou Heatmap comparando as respostas totais de "Sim" (verde) e "Não" (vermelho) por Objetivo/Tarefa ao longo dos dias.

Gráfico de Frequência-Intensidade: Um gráfico onde o eixo X são os dias do mês, e o eixo Y representa a Duração em Minutos. Use cores específicas para as barras indicando a intensidade do comportamento: Azul para "Leve", Amarelo para "Moderada" e Vermelho para "Intensa".

Módulo 5: Visão do Pai/Responsável (Portal dos Pais)

Interface extremamente simples, similar ao feed de uma rede social.

Feed de Devolutivas: Onde os pais leem o resumo diário simples (sem jargões técnicos) do que o filho fez no dia.

Quadro de Avisos: Área destacada no topo para recados e comunicados gerais da clínica, eliminando o uso de grupos de WhatsApp.

Módulo 6: Visão da Supervisora (Admin)

Dashboard principal contendo o número total de pacientes ativos, terapeutas e aprovações pendentes.

Controle de horas: Uma tabela simples de RH visualizando as horas trabalhadas pelos terapeutas por dia/sessão.

Fórum Clínico Interno: Uma interface de chat/mensagens com threads embutidas no sistema para discussão de casos clínicos e reuniões semanais da equipe.

Certifique-se de que a interface seja moderna, limpa, não gere erros no console e possua transições suaves entre as telas. Todas as tabelas e gráficos devem vir com dados mockados para facilitar a visualização da arquitetura.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://gestao-clinica-aba.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6186704f-743a-48da-83c6-a2658c344dae).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
