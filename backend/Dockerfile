# Python 3.11 이미지를 사용 예시
FROM python:3.11

# 작업 디렉터리 설정
WORKDIR /app

# requirements.txt만 먼저 복사 → pip install (캐시 활용)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 소스 복사
COPY . .

# Flask 서버가 5000 포트 사용 (예시)
EXPOSE 5000

# 컨테이너 실행 시 app.py 실행
CMD ["python", "-u", "app.py"]
