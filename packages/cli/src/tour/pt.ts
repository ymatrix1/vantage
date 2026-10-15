// Texto do tour em português. Só exemplos sintéticos.
import type { TourText } from "./types.ts";

export const pt: TourText = {
  intro: "Tour do Vantage: 8 passos curtos, uns 3 minutos. Nada é lido da sua máquina e nada é enviado.",
  stepLabel: (n, total) => `Passo ${n} de ${total}`,
  pressEnter: "Aperte Enter para continuar (Ctrl+C para sair)",
  steps: [
    {
      title: "O que o Vantage mostra, e por quê",
      lines: [
        "O Vantage mostra até onde cada trabalho seu realmente chegou.",
        'Agentes dizem "pronto" rápido. O Vantage espera por evidência.',
        "Uma linha por trabalho (um work item), não uma por conversa.",
        "",
        "Exemplo de linha (inventado):",
        "  add-retry      ●●◐○○○   Built · no proof yet",
        '                          o agente disse "pronto"; nenhum teste rodou depois da última edição',
      ],
    },
    {
      title: "As seis etapas",
      lines: [
        "Todo item anda pela mesma trilha, um passo de cada vez:",
        "  Asked → Built → Proven → Reviewed → Shipped → Verified",
        "  (pedido → construído → provado → revisado → entregue → verificado)",
        'Exemplo, "add-retry":',
        "  Asked    você pediu                      ●○○○○○",
        "  Built    3 arquivos mudaram num branch   ●●○○○○",
        "  Proven   um teste passou após a edição   ●●●○○○",
        "Hoje o Vantage conhece as três primeiras; as outras dependem de fontes futuras (PRs, deploys).",
      ],
    },
    {
      title: "Os pontos",
      lines: [
        "A forma diz o estado primeiro, a cor reforça (assim funciona para todo mundo):",
        "  ●  feito (verde)                    ◉  em andamento (azul)",
        "  ◐  construído, sem prova (âmbar)    ◍! precisa de você (vermelho)",
        "  –  pulado ou não configurado        ○  ainda não",
        'A página Track repete isso na legenda, "What the dots mean",',
        'e escreve a etapa em palavras ao lado dos pontos, como "Built · no proof yet".',
      ],
    },
    {
      title: "Prova: o que vale",
      lines: [
        "Prova é uma checagem que realmente rodou depois da sua última edição e passou.",
        "  vale        pnpm test          (saída 0, testes rodaram, depois da última edição)",
        "  não vale    pnpm test || true  (não pode falhar, então não prova nada)",
        "  não vale    um teste de antes da última edição (o código mudou desde então)",
        '  não vale    "tudo corrigido!" no chat (afirmação, não evidência)',
        "Edite o código de novo e a prova expira: Proven volta para Built.",
      ],
    },
    {
      title: "Flags e Needs you",
      lines: [
        "Uma flag (alerta) é um aviso num item, com uma ação sugerida.",
        "  unproven claim  disse que terminou, sem checagem depois da edição  → pedir prova",
        "  thrashing       3 ciclos de editar e falhar no mesmo arquivo       → montar uma reprodução",
        "  forgotten       sem atividade há 5 dias                            → retomar, estacionar ou descartar",
        '"Needs you" (precisa de você) é o grupo de itens que esperam algo que só você pode fazer.',
        "O resto pode ser ignorado até o resumo.",
      ],
    },
    {
      title: "Como ler um item",
      lines: [
        "  fix-login-timeout     demo-api · fix/login-timeout     ●●◐○○○",
        "  ^ título (do ticket, do branch ou do seu primeiro pedido)",
        "                        ^ repositório e branch a que está ligado",
        "                                                         ^ os seis pontos",
        "Clique numa linha da página Track para ver a evidência de cada ponto:",
        "a edição vista, o comando que rodou, o código de saída e por que ele está onde está.",
        'Uma linha chamada "Session abc12345" é uma sessão com edições e sem ticket, branch ou pedido legível.',
      ],
    },
    {
      title: "Comandos do dia a dia",
      lines: [
        "  vantage start     roda o Vantage (deixe aberto num terminal)",
        "  vantage open      abre a página Track no navegador",
        "  vantage doctor    confere se tudo funciona, com a correção de cada problema",
        "  vantage stats     números da sua página Track, só leitura",
        "  vantage add       começa a acompanhar este repositório (simulação primeiro, depois o seu sim)",
        "  vantage remove    para de acompanhar este repositório",
      ],
    },
    {
      title: "Seus dados, e como desfazer",
      lines: [
        "Tudo fica numa pasta só: ~/.vantage (ou a pasta que VANTAGE_HOME indicar).",
        "Por padrão nada sai da sua máquina. Nenhum modelo externo é chamado.",
        "Para desfazer:",
        "  vantage remove     para de acompanhar este repositório",
        "  vantage uninstall  remove os hooks e a status line que o Vantage adicionou",
        "  apague ~/.vantage  apaga os dados, você mesmo",
      ],
    },
  ],
  outro: [
    "Fim do tour. Próximo passo: `vantage add --dry-run` num repositório em que você trabalha.",
    "Quer clicar antes? `vantage tour --demo` abre dados inventados e limpa tudo quando você para.",
    "Mais: docs/pt-BR/GUIDE.md e docs/pt-BR/GLOSSARY.md.",
  ],
  demo: {
    starting:
      "Montando uma pasta de demonstração temporária com itens inventados (a sua pasta real do Vantage não é tocada)...",
    open: "Abra a página Track da demonstração:",
    fake: "Tudo nela é inventado: repositórios chamados demo-*, nenhum dado real.",
    stop: "Aperte Ctrl+C para parar; os dados da demonstração são apagados ao sair.",
    cleaned: "Demonstração encerrada e arquivos temporários apagados.",
  },
};
