# Como Criar os Ícones do PWA

Para que o ícone personalizado apareça quando o usuário adiciona o app ao ecrã principal, você precisa criar os seguintes arquivos na pasta `public/`:

## Ícones Necessários

1. **apple-touch-icon.png** (180x180 pixels)
   - Ícone usado no iOS quando adiciona ao ecrã principal
   - Deve ser quadrado, sem cantos arredondados (o iOS aplica automaticamente)

2. **icon-192.png** (192x192 pixels)
   - Ícone usado em dispositivos Android e outros
   - Deve ser quadrado

3. **icon-512.png** (512x512 pixels)
   - Ícone de alta resolução usado em dispositivos Android
   - Deve ser quadrado

## Como Criar os Ícones

### Opção 1: Usando um Gerador Online
1. Acesse https://realfavicongenerator.net/ ou https://www.pwabuilder.com/imageGenerator
2. Faça upload de uma imagem quadrada (recomendado: 512x512 ou maior)
3. Baixe os ícones gerados
4. Coloque os arquivos na pasta `chococlair/public/`

### Opção 2: Criar Manualmente
1. Crie uma imagem quadrada com o logo/ícone do Chococlair
2. Use um editor de imagem (Photoshop, GIMP, Canva, etc.) para redimensionar:
   - `apple-touch-icon.png` → 180x180px
   - `icon-192.png` → 192x192px
   - `icon-512.png` → 512x512px
3. Salve como PNG com fundo transparente (recomendado)
4. Coloque os arquivos na pasta `chococlair/public/`

### Opção 3: Usar um SVG e Converter
Se você tem um SVG do logo:
1. Use https://cloudconvert.com/svg-to-png ou similar
2. Converta para PNG nas resoluções necessárias
3. Coloque os arquivos na pasta `chococlair/public/`

## Estrutura Final

Após criar os ícones, a pasta `public/` deve conter:

```
chococlair/public/
├── apple-touch-icon.png (180x180)
├── icon-192.png (192x192)
├── icon-512.png (512x512)
├── favicon.ico
├── manifest.json
└── robots.txt
```

## Testar

1. Após adicionar os ícones, faça o build do projeto: `npm run build`
2. Abra o site no Safari do iPhone
3. Toque no botão de compartilhar
4. Selecione "Adicionar ao Ecrã Principal"
5. O ícone personalizado deve aparecer!

## Nota Importante

- Os ícones devem ser quadrados (mesma largura e altura)
- Use cores vibrantes e contrastantes para melhor visibilidade
- Evite texto muito pequeno no ícone
- O iOS aplica automaticamente cantos arredondados e sombras

