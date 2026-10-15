<!--
Nota de estilo: guia para leigos e recém-chegados, por isso usa frases completas e amigáveis em vez do estilo
compacto das specs. Versão em português de docs/GUIDE.md (não é tradução literal). A versão em inglês manda:
veja a data de sincronização em docs/pt-BR/README.md.
-->

# Guia do Vantage

In English: [Guide](../GUIDE.md). As palavras com link levam ao [glossário](GLOSSARY.md), onde cada uma tem uma linha de explicação.

## O que é o Vantage

O Vantage é um programa pequeno que roda no seu computador e mostra, com honestidade, até onde cada trabalho realmente chegou. Quando agentes de IA como o Claude Code fazem boa parte da digitação, é fácil perder o fio: o que foi pedido, o que foi construído e o que foi de fato testado. O Vantage observa os rastros que essas ferramentas deixam (sessões de agente, git e, mais tarde, pull requests e deploys) e desenha uma linha por trabalho. A linha só avança quando existe evidência, nunca porque um agente disse "pronto".

## O problema, em três exemplos do dia a dia

1. **"Corrigido!"** Um agente diz que corrigiu o bug e você segue em frente. Ninguém rodou um teste. Dois dias depois quebra. O Vantage mostra essa linha como *construída*, mas não *provada*.
2. **Onde eu estava?** Você volta na segunda com seis janelas de conversa abertas. Qual tem mudanças não salvas no git? Qual só discutiu uma ideia? O Vantage lista todas com o estado real.
3. **Espera silenciosa.** Uma sessão espera o seu "sim" há uma hora e você nem viu. O Vantage coloca isso em [Precisa de você](GLOSSARY.md#needs-you-precisa-de-você).

## Como funciona, em cinco passos

1. **Os hooks escutam.** Pequenos comandos ([hooks](GLOSSARY.md#hook-gancho)) que o Claude Code e o git executam gravam uma linha por evento numa pasta local, o [spool](GLOSSARY.md#spool-fila-local). Eles nunca atrasam o seu trabalho.
2. **O daemon lê.** Um programa em segundo plano, o [daemon](GLOSSARY.md#daemon-serviço) (`vantage start`), transforma essas linhas num banco de dados local.
3. **O linker agrupa.** Eventos sobre o mesmo ticket, branch ou worktree são ligados num só [item de trabalho](GLOSSARY.md#work-item-item-de-trabalho) (veja [âncora](GLOSSARY.md#anchor-âncora)).
4. **A etapa é derivada.** Cada item recebe uma etapa da trilha de seis passos, só com base em evidência.
5. **Você olha.** Abra a página Track com `vantage open`.

Tudo fica na sua máquina.

## Como ler a página Track

Cada linha é um item de trabalho. Da esquerda para a direita:

- **Os seis pontos** são os seis passos: Asked (pedido), Built (construído), Proven (provado), Reviewed (revisado), Shipped (entregue), Verified (verificado). Ponto verde cheio = feito. Anel azul grosso = em andamento. Ponto âmbar meio preenchido = "construído, sem prova". Anel com marca vermelha = precisa de você. Traço cinza curto = "pulado ou não configurado". Anel claro e fino = "ainda não". A forma vem primeiro e a cor depois, então funciona também para daltonismo.
- **O rótulo da etapa** ao lado diz isso em palavras, por exemplo "Built · no proof yet".
- **Flags** (alertas) são avisos com uma ação sugerida cada, por exemplo [afirmação sem prova](GLOSSARY.md#unproven-claim-afirmação-sem-prova) ou [thrashing](GLOSSARY.md#thrashing-vai-e-vem).
- **Prova** mostra a força da evidência. Mais arcos verdes no ponto Proven = prova mais forte (veja [nível de prova](GLOSSARY.md#proof-level-nível-de-prova)).
- **Precisa de você** é o grupo no topo: itens que esperam algo que só você pode fazer.

Clique numa linha para ver por que ela está onde está.

## O que o Vantage nunca faz

- Nunca move um cartão porque um agente disse que terminou. Só evidência move cartões.
- Nada sai da sua máquina a menos que você ligue. Por padrão nenhum modelo externo é chamado.
- Nunca faz commit por você, nunca edita o seu repositório e nunca guarda senhas ou tokens.
- Nunca bloqueia o seu agente: a checagem ao parar só avisa.

## Uma rotina diária de cinco minutos

1. **Iniciar:** `vantage start` num terminal que fica aberto (cerca de 10 segundos).
2. **Abrir:** `vantage open` e olhar primeiro o *Precisa de você* (1 minuto).
3. **Agir em cada alerta:** pedir prova, responder à sessão que espera ou estacionar o que você não vai tocar hoje (2 minutos).
4. **Olhar o resto:** algo âmbar e antigo? Retome, estacione ou descarte (1 minuto).
5. **Checar a saúde quando algo parecer estranho:** `vantage doctor` (30 segundos).

## Perguntas frequentes

**1. Por que meu item está "Built" e não "Proven"?**
Nenhuma checagem rodou depois da sua última edição de código, ou a checagem era fraca demais para valer (só imprimiu texto sem poder falhar, ou rodou zero testes). Rode o teste de verdade e espere a próxima passada, cerca de 30 segundos.

**2. O que é uma flag?**
Um aviso num item, com uma ação sugerida. A [lista de flags](../specs/flags.md) (em inglês) nomeia todas. Âmbar espera o resumo; vermelho interrompe.

**3. Por que existe um item chamado "Untitled session"?**
Aquela sessão teve edições, mas nenhum ticket, branch ou primeiro pedido legível para dar nome. O nome é "Untitled session" com a data, ou o repo e o branch quando são conhecidos; o Vantage nunca mostra o id bruto da sessão como nome. Uma sessão que só continua outra (um resume ou um clear) entra no item da sessão original.

**4. Por que meu item Proven voltou para Built?**
A prova pertence ao código que ela checou. Você editou o código depois, então a prova expirou. Rode a checagem de novo.

**5. O Vantage lê o meu código ou as minhas conversas?**
Ele guarda localmente o que os hooks entregam, incluindo as entradas das ferramentas. A primeira frase do primeiro pedido de uma sessão vira o título, limpa de caminhos e segredos. Dá para desligar os títulos com `item_titles_from_requests = false` e apagá-los com `vantage titles clear`.

**6. Onde ficam os meus dados?**
Em `~/.vantage` (ou na pasta indicada por `VANTAGE_HOME`): `spool/`, `vantage.db`, `token`, `status.json`, `health.json`. Nada é enviado a lugar nenhum.

**7. Como desfaço?**
`vantage remove` para de acompanhar este repositório. `vantage uninstall` remove os hooks e a status line que ele adicionou (só as entradas marcadas com `--vantage-managed`). Apague `~/.vantage` você mesmo para eliminar os dados.

**8. A página Track está vazia.**
Use o Claude Code num repositório registrado com `vantage add`, espere uns 30 segundos e rode `vantage doctor`.

**9. Um agente consegue enganar a prova?**
Ele pode dizer o que quiser; isso não move nada. Um comando que não pode falhar (`echo ok`, `pnpm test || true`) não conta, e uma execução com zero testes também não.

**10. Preciso conhecer o método A2V?**
Não. A [página do método](../METHOD.md) (em inglês) explica de onde vêm as ideias, para quem tem curiosidade. Para testar o Vantage primeiro com dados inventados, use `vantage tour --demo` (veja a [spec de primeiro uso](../specs/first-run.md#the-guided-tour)).

Próximos passos: [glossário](GLOSSARY.md), [todos os docs por público](../README.md).
