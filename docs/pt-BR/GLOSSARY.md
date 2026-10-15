<!--
Nota de estilo: glossário para leigos e recém-chegados, com frases completas e amigáveis. Versão em português de
docs/GLOSSARY.md (natural, não literal). Cada entrada tem as mesmas três linhas: Simples, Exemplo, Definido em.
O título de cada entrada traz o termo em inglês, que é o que aparece na interface e nos docs, e a tradução entre
parênteses. A versão em inglês manda; tools/check_docs.py confere que o número de entradas é o mesmo.
-->

# Glossário

Todos os termos que os docs e a página Track usam, de A a Z (pela ordem do glossário em inglês). Cada entrada diz o que o termo significa em palavras simples, dá um exemplo e aponta para a spec que o define com exatidão. As specs estão em inglês.

Novo por aqui? Leia primeiro o [guia](GUIDE.md). In English: [Glossary](../GLOSSARY.md).

## Termos de método emprestados

Os docs usam algumas ideias da consultoria de gestão por um único motivo: **quem lê tem pressa**. A resposta vem primeiro, depois as razões, depois os detalhes, para que quem parar na primeira linha já tenha o ponto principal. Estas entradas têm links para fontes externas.

### A2V
**Simples:** "Asked to Verified" (do pedido à verificação), o método que o Vantage segue. Todo trabalho passa por seis etapas e só evidência o faz avançar.
**Exemplo:** um ticket é pedido, o código é construído, uma execução de teste prova, alguém revisa, o deploy sai e o monitoramento fica quieto.
**Definido em:** [Método A2V](../METHOD.md)

### A2V track (trilha A2V)
**Simples:** as seis etapas em ordem: Asked, Built, Proven, Reviewed, Shipped, Verified.
**Exemplo:** um item com código e um teste passando está em "Proven"; os dois pontos seguintes ainda estão vazios.
**Definido em:** [Método A2V](../METHOD.md#the-a2v-track), [Lifecycle](../specs/lifecycle.md)

### Anchor (âncora)
**Simples:** um rótulo que liga evidência a um trabalho, como a chave de um ticket, um branch ou o número de um pull request.
**Exemplo:** um commit no branch `feat/login` e uma sessão iniciada nesse branch se ligam ao mesmo item.
**Definido em:** [Work item model](../specs/work-item-model.md#anchors-in-order-of-trust)

### Answer first (resposta primeiro)
**Simples:** a regra de escrita em que a primeira frase é a resposta, depois vêm as razões e depois os detalhes. Veja também [Princípio da Pirâmide](#pyramid-principle-princípio-da-pirâmide).
**Exemplo:** "Fique com o SQLite; use o DuckDB só para análise." vem antes da tabela de comparação.
**Definido em:** [Regra de comunicação](../../plugin/a2v/rules/communication.md), [Explain](../specs/explain.md)

### Asked (pedido)
**Simples:** a primeira etapa. Alguém quer esse trabalho: um ticket, um branch, um pedido a um agente ou uma promessa.
**Exemplo:** você diz ao Claude Code "adicione uma nova tentativa no upload"; o item é Asked antes de existir qualquer código.
**Definido em:** [Lifecycle](../specs/lifecycle.md)

### Backfill (carga retroativa)
**Simples:** ler o histórico antigo (os últimos 14 dias por padrão) para que a página Track não comece vazia.
**Exemplo:** depois do `vantage add`, as sessões da semana passada naquele repositório aparecem como itens.
**Definido em:** [First run](../specs/first-run.md), [Ingestion](../specs/ingestion.md)

### Behavior (comportamento)
**Simples:** uma frase curta no formato "dado, quando, então" dizendo o que o trabalho deve fazer, para você julgar o comportamento em vez de ler um diff.
**Exemplo:** "Dado um upload que falhou, quando ele é repetido, então para depois de 3 tentativas."
**Definido em:** [Work item model](../specs/work-item-model.md#entities), [Behaviors and detectors](../specs/behaviors-and-detectors.md)

### Built (construído)
**Simples:** existe código para o trabalho: há um diff ligado ao item.
**Exemplo:** o agente editou três arquivos no branch; o item está Built, ainda não Proven.
**Definido em:** [Lifecycle](../specs/lifecycle.md)

### Calm (calma)
**Simples:** o objetivo de design de mostrar pouco: as 3 coisas principais, um resumo para o resto e um "pode ignorar" explícito.
**Exemplo:** "Nada precisa de você. 9 itens podem ser ignorados hoje."
**Definido em:** [UX](../UX.md), [Visual language](../specs/visual-language.md)

### Daemon (serviço)
**Simples:** o programa pequeno em segundo plano (`vantage start`) que lê o spool, mantém o banco atualizado e serve a página Track na sua própria máquina.
**Exemplo:** feche o terminal onde roda o `vantage start` e a página Track para de atualizar.
**Definido em:** [Operations](../specs/operations.md), [Architecture](../ARCHITECTURE.md)

### Decision log (registro de decisões)
**Simples:** um registro escrito de toda escolha, de um agente ou de uma pessoa, com o porquê e as alternativas consideradas.
**Exemplo:** um agente decide sozinho "repetir 3 vezes"; essa escolha fica como proposta até você aprovar.
**Definido em:** [Decision log](../specs/decision-log.md)

### Derived session (sessão derivada)
**Simples:** uma sessão que continua outra (resume, fork, continuação ou sub-agente), então entra no item da sessão original em vez de criar um novo.
**Exemplo:** você roda `/clear` e continua trabalhando; a nova sessão cai no mesmo item.
**Definido em:** [Work item model](../specs/work-item-model.md#derived-sessions)

### Dot (ponto)
**Simples:** o símbolo pequeno de uma etapa da trilha. A forma diz o estado (cheio, anel, meio preenchido, traço) e a cor reforça.
**Exemplo:** um ponto verde cheio é feito; um ponto âmbar meio preenchido é "construído, sem prova ainda".
**Definido em:** [Visual language](../specs/visual-language.md#the-dot-alphabet)

### Evidence (evidência)
**Simples:** um fato que o Vantage viu por conta própria: um diff, um comando que rodou com o seu código de saída, uma aprovação, um deploy. O que um agente diz não é evidência.
**Exemplo:** "os testes passaram" numa mensagem é uma afirmação; uma execução do `vitest` com saída 0 capturada pelo Vantage é evidência.
**Definido em:** [Método A2V](../METHOD.md#the-five-rules), [Proof](../specs/proof.md)

### Expired proof (prova expirada)
**Simples:** uma prova que deixou de valer porque o código mudou depois da checagem. O item volta de Proven para Built.
**Exemplo:** os testes passaram e depois o agente editou `upload.ts`; a prova aparece riscada e o item volta a Built.
**Definido em:** [Proof](../specs/proof.md#freshness)

### Explain (explicar)
**Simples:** um resumo sob demanda, com a resposta primeiro, sobre um item, um projeto ou uma semana, escrito pelo agente que você já usa. Aperte `e` em qualquer coisa.
**Exemplo:** "Por que este item travou?" abre uma resposta curta, depois as razões e depois um detalhamento que se expande ao clicar.
**Definido em:** [Explain](../specs/explain.md)

### Flag (alerta)
**Simples:** um aviso num item de trabalho, com uma ação sugerida. O método chama a mesma coisa de [sinal](#signal-sinal).
**Exemplo:** `unproven_claim` diz "o agente afirmou que terminou, mas nenhuma checagem rodou depois da última edição"; a ação é "pedir prova".
**Definido em:** [Flag registry](../specs/flags.md)

### Fingerprint (impressão digital do código)
**Simples:** o "code fingerprint": o registro de qual código uma prova cobriu, usado para saber se a prova ainda está válida.
**Exemplo:** um teste cobre `upload.ts`; qualquer edição posterior em `upload.ts` deixa a prova desatualizada.
**Definido em:** [Proof](../specs/proof.md#the-proof-record)

### Forgotten (esquecido)
**Simples:** um alerta para trabalho pedido ou construído que ficou sem atividade por um tempo (5 dias por padrão).
**Exemplo:** um branch mexido pela última vez há seis dias mostra uma lua: retomar, estacionar ou descartar.
**Definido em:** [Scoring](../specs/scoring.md#staleness-and-forgotten), [Flag registry](../specs/flags.md)

### Hook (gancho)
**Simples:** um comando pequeno que o Claude Code (ou o git) executa em momentos fixos, como depois de cada chamada de ferramenta. Os hooks do Vantage só gravam uma linha no spool e voltam na hora.
**Exemplo:** depois que o agente roda um teste, o hook `PostToolUse` registra o comando e o código de saída.
**Definido em:** [Ingestion](../specs/ingestion.md), [First run](../specs/first-run.md#adding-an-existing-repo)

### Home (VANTAGE_HOME) (pasta do Vantage)
**Simples:** a pasta onde ficam todos os seus dados do Vantage: `~/.vantage` por padrão, ou a pasta indicada pela configuração `VANTAGE_HOME`.
**Exemplo:** `vantage tour --demo` usa uma pasta temporária, então a sua pasta real nunca é tocada.
**Definido em:** [Operations](../specs/operations.md)

### Issue tree (árvore de questões)
**Simples:** um jeito de quebrar uma pergunta grande em perguntas menores, desenhado como uma árvore. O Explain do Vantage usa isso para você abrir só os ramos que interessam. Referência externa: [Issue tree na Wikipédia](https://en.wikipedia.org/wiki/Issue_tree) (em inglês).
**Exemplo:** "Por que a entrega atrasou?" se divide em "código não ficou pronto", "revisão pendente" e "deploy bloqueado", e cada um pode se dividir de novo.
**Definido em:** [Explain](../specs/explain.md)

### Landscape (paisagem)
**Simples:** a tela inicial desenhada como uma cena: o que precisa de você na frente, o trabalho em andamento no meio, o que espera os outros no horizonte e o trabalho verificado como estrelas. É um projeto de design, ainda não construído; o que existe hoje é a página Track.
**Exemplo:** três pontos grandes em primeiro plano são as três coisas de hoje.
**Definido em:** [Visual language](../specs/visual-language.md#the-landscape-home)

### Linker (ligador)
**Simples:** a parte do Vantage que decide a qual item cada evento pertence, usando primeiro as âncoras.
**Exemplo:** um evento com o branch `feat/login` se liga ao item desse branch.
**Definido em:** [Work item model](../specs/work-item-model.md#linking-rules)

### MECE
**Simples:** "mutuamente exclusivo, coletivamente exaustivo": grupos que não se sobrepõem e juntos cobrem tudo. O Vantage usa isso para que um detalhamento não conte nada em dobro nem deixe lacunas. Referência externa: [MECE principle na Wikipédia](https://en.wikipedia.org/wiki/MECE_principle) (em inglês).
**Exemplo:** itens por etapa (Asked, Built, Proven...) é MECE: cada item está em exatamente uma.
**Definido em:** [Explain](../specs/explain.md), [Regra de comunicação](../../plugin/a2v/rules/communication.md)

### Needs you (precisa de você)
**Simples:** o grupo de itens que esperam algo que só você pode fazer: responder uma pergunta, aprovar uma decisão, pedir prova. Num ponto aparece como um anel com uma marca vermelha.
**Exemplo:** uma sessão esperando uma permissão levanta `waiting_on_you`.
**Definido em:** [Visual language](../specs/visual-language.md#the-dot-alphabet), [Flag registry](../specs/flags.md)

### Proof (prova)
**Simples:** o registro de uma checagem que realmente rodou, como um teste ou uma consulta de dados, capturada pelo Vantage. Tem um tipo e um nível.
**Exemplo:** `pnpm test` saiu com 0 e rodou 43 testes depois da última edição.
**Definido em:** [Proof](../specs/proof.md)

### Proof level (nível de prova)
**Simples:** a força de uma prova, de L0 a L4: L0 afirmada (não é prova), L1 rodou, L2 ligada ao código alterado, L3 ligada a um comportamento, L4 passou em produção.
**Exemplo:** um teste que importa o arquivo alterado é L2; `pnpm test || true` não é prova nenhuma porque não pode falhar.
**Definido em:** [Proof](../specs/proof.md#strength-levels), [Método A2V](../METHOD.md#proof-levels)

### Proven (provado)
**Simples:** a terceira etapa. Uma checagem rodou depois da última edição e passou.
**Exemplo:** o item vai de ponto âmbar meio preenchido ("sem prova") para um ponto verde cheio com um arco.
**Definido em:** [Lifecycle](../specs/lifecycle.md), [Proof](../specs/proof.md)

### Pyramid Principle (Princípio da Pirâmide)
**Simples:** a regra de escrita de Barbara Minto: diga primeiro o ponto principal, depois as poucas ideias que o sustentam e depois os detalhes. Os docs do Vantage usam isso porque quem lê tem pressa e pode parar na primeira linha. Referências externas (em inglês): [Barbara Minto na Wikipédia](https://en.wikipedia.org/wiki/Barbara_Minto), [a página da própria Minto sobre o conceito](https://www.barbaraminto.com/concept). Também chamado de escrita top-down.
**Exemplo:** primeiro "Fique com o SQLite."; depois as três razões; por último a tabela de benchmark.
**Definido em:** [Regra de comunicação](../../plugin/a2v/rules/communication.md), [Explain](../specs/explain.md)

### Quiet mode (modo silencioso)
**Simples:** uma configuração que esconde os alertas âmbar até o resumo e desliga movimento e rostinhos. Os alertas vermelhos continuam aparecendo.
**Exemplo:** durante um bloco de foco, só o `waiting_on_you` interrompe você.
**Definido em:** [Flag registry](../specs/flags.md#rules), [Visual language](../specs/visual-language.md#quiet-mode-and-accessibility)

### Reviewed (revisado)
**Simples:** a quarta etapa. Outra pessoa aprovou e os comentários que bloqueiam foram resolvidos.
**Exemplo:** um pull request aprovado sem discussões bloqueantes abertas.
**Definido em:** [Lifecycle](../specs/lifecycle.md)

### SCR
**Simples:** "Situation, Complication, Resolution" (situação, complicação, resolução): uma história em três partes usada nos resumos. O que é verdade agora, o que está errado ou mudou, o que fazer. A ideia vem da consultoria; o site da própria Minto descreve um parente próximo, o SCQ, em que a última parte é uma pergunta (Question): [barbaraminto.com](https://www.barbaraminto.com/). Não foi encontrada uma página que defina o SCR em si, então não há link direto.
**Exemplo:** "O build está verde (situação). A checagem de deploy nunca rodou (complicação). Rode-a antes de fazer o merge (resolução)."
**Definido em:** [Explain](../specs/explain.md), [Método A2V](../METHOD.md#calm-practices)

### Session (sessão)
**Simples:** uma conversa com um agente como o Claude Code.
**Exemplo:** uma sessão intitulada pelo primeiro pedido: "adicione uma nova tentativa no upload". Sem um nome melhor, o item aparece como "Session abc12345", os primeiros caracteres do id.
**Definido em:** [Work item model](../specs/work-item-model.md#entities)

### Shipped (entregue)
**Simples:** a quinta etapa. O trabalho foi integrado (merge) e publicado (deploy).
**Exemplo:** o pull request foi mesclado e o job de deploy terminou.
**Definido em:** [Lifecycle](../specs/lifecycle.md)

### Signal (sinal)
**Simples:** a palavra do método para [flag](#flag-alerta).
**Exemplo:** veja Flag.
**Definido em:** [Método A2V](../METHOD.md#signals), [Flag registry](../specs/flags.md)

### Spool (fila local)
**Simples:** uma pasta local onde os hooks deixam uma linha por evento. O daemon a lê e transforma em linhas do banco de dados.
**Exemplo:** `~/.vantage/spool/` se enche de arquivinhos enquanto o Claude Code trabalha.
**Definido em:** [Ingestion](../specs/ingestion.md), [Operations](../specs/operations.md)

### Stage (etapa)
**Simples:** um dos seis passos da trilha A2V. A etapa de um item é o último passo cuja evidência existe.
**Exemplo:** "Built · no proof yet" quer dizer que a etapa é Built e Proven ainda não foi alcançada.
**Definido em:** [Lifecycle](../specs/lifecycle.md)

### Status line (linha de status)
**Simples:** uma linha curta de símbolos no terminal mostrando o item da sessão atual.
**Exemplo:** `●●◐○○○` para um item Built sem prova.
**Definido em:** [Status line](../specs/status-line.md)

### Stop gate (checagem ao parar)
**Simples:** uma checagem quando o agente para. Se ele editou código e nada provou, você recebe uma mensagem com os arquivos. No modo de aviso, nunca bloqueia.
**Exemplo:** "Você alterou `billing.ts`; nenhum teste rodou depois dessa edição."
**Definido em:** [Proof](../specs/proof.md#the-gate)

### Thrashing (vai e vem)
**Simples:** um alerta para ciclos de editar, falhar, editar, falhar nos mesmos arquivos, três ou mais vezes seguidas. Sinal de que o agente precisa de uma reprodução em vez de mais palpites.
**Exemplo:** o mesmo teste falha depois de quatro edições em `queue.ts`.
**Definido em:** [Behaviors and detectors](../specs/behaviors-and-detectors.md), [Flag registry](../specs/flags.md)

### Track page (página Track)
**Simples:** a página web (`vantage open`) com uma linha por item: seis pontos, o rótulo da etapa, alertas e prova. É a página que existe hoje.
**Exemplo:** uma linha diz "Built · no proof yet" com um ponto âmbar meio preenchido.
**Definido em:** [UX](../UX.md#track), [Web UI](../specs/web-ui.md)

### Unproven claim (afirmação sem prova)
**Simples:** um alerta para um agente que disse ter terminado depois de editar código, sem nenhuma checagem passando depois da última edição.
**Exemplo:** "Tudo corrigido!" e nenhum teste rodou desde a edição.
**Definido em:** [Proof](../specs/proof.md), [Flag registry](../specs/flags.md)

### Verified (verificado)
**Simples:** a sexta etapa. Depois do deploy, as checagens passaram e o monitoramento ficou limpo. Precisa de fontes de fases futuras.
**Exemplo:** um smoke test em produção passou e nenhum alerta disparou por 24 horas.
**Definido em:** [Lifecycle](../specs/lifecycle.md#verified-in-detail)

### Work item (item de trabalho)
**Simples:** um objetivo, mostrado como uma linha. O Vantage acompanha itens de trabalho, não sessões: várias sessões podem alimentar um item.
**Exemplo:** um branch `feat/login` trabalhado por três sessões é um item só.
**Definido em:** [Work item model](../specs/work-item-model.md)

### Worktree
**Simples:** um checkout extra de um repositório git em sua própria pasta, para vários agentes trabalharem em branches diferentes ao mesmo tempo.
**Exemplo:** `.claude/worktrees/login-fix` é um worktree do repositório principal; ele corresponde a um item.
**Definido em:** [Work item model](../specs/work-item-model.md#boundary-rules)
