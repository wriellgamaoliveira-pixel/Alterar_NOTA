# Liberação local por código

Todas as rotas ficam atrás de `AccessGate`. Sem licença assinada válida, somente a
tela de solicitação/ativação é montada. Os providers e módulos fiscais não são
montados. O vencimento é checado a cada segundo e quando a aba volta ao primeiro
plano. A licença é validada novamente ao abrir o site e em mudanças de armazenamento
vindas de outra aba.

O usuário prepara o pedido e confirma seu envio no WhatsApp. O responsável recebe
o nome e o código do navegador, autoriza o prazo e repassa uma licença assinada.
Não existe recebimento automático de pedidos neste chat nem lista central de acessos.

## Emissão pelo responsável

A chave privada desta instalação está no computador do responsável, fora do Git,
em `C:/Users/WGO/.codex/access-keys/Alterar_NOTA/private-key.pem`. Faça uma cópia
segura privada: sua perda impede emitir novas licenças compatíveis com a chave
pública publicada. Nunca envie a chave no WhatsApp, no chat ou ao repositório.

Depois de autorização explícita para um pedido, execute no computador responsável:

```text
node scripts/access-license.mjs issue CAMINHO_ABSOLUTO_DA_CHAVE "USUARIO" CODIGO_DO_NAVEGADOR HORAS
```

24 horas = `24`; uma semana = `168`; N dias = N × 24 horas. A validade começa
na emissão, não na primeira ativação. O resultado é o código que deve ser repassado
ao solicitante. Não há liberação automática do administrador nem senha universal.

Somente a chave pública em `src/services/accessPublicKey.ts` é enviada no site.
Não execute `init` novamente para esta instalação: isso cria outra identidade de
assinatura. O comando recusa sobrescrever um arquivo de chave existente.

## Limitações do modelo gratuito

O bloqueio é local e pode ser contornado por quem alterar o JavaScript ou os dados
do navegador. O relógio é local; o checkpoint dificulta recuos simples, mas não
substitui uma fonte de tempo confiável no servidor. Copiar o perfil do navegador
também pode copiar a identidade e a licença. Não há revogação remota/offline.

Limpar o armazenamento ou trocar de navegador exige novo pedido. Bloquear ou vencer
uma licença não apaga os XMLs nem o IndexedDB fiscal. Abrir somente a página bloqueada
não abre o banco fiscal. A versão do site carregada antes da atualização precisa ser
recarregada para receber o bloqueio.

## Verificação local

```text
node --test scripts/access-license.test.mjs
```

Os testes usam chaves efêmeras e armazenamento falso em memória, sem XMLs, banco
fiscal, WhatsApp ou serviços externos.
