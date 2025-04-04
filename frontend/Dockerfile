# Node 18 LTS 예시
FROM node:18

WORKDIR /app

# package.json, package-lock.json 복사 → npm install
COPY package*.json ./
RUN npm install

# 소스 복사
COPY . .

# Vite 개발 서버가 5173 포트를 사용 (기본)
EXPOSE 5173

# 개발 모드 시 "npm run dev"
# 실제 운영이라면 "npm run build" 후 serve 방식
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
