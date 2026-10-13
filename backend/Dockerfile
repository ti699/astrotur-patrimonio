FROM node:22-alpine

WORKDIR /app

# Copia arquivos de dependências
COPY package*.json ./

# Instala todas as dependências (incluindo devDependencies como tsx)
RUN npm install

# Copia o código-fonte
COPY . .

EXPOSE 3000

# Inicializa o servidor usando o script start do package.json
CMD ["npm", "start"]