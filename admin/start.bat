@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo =============================================
echo  KakaoTalk Web 관리자
echo =============================================
echo.

if not exist node_modules (
  echo [1/3] 패키지 설치 중...
  npm install
  if errorlevel 1 (
    echo 패키지 설치 실패
    pause
    exit /b 1
  )
  echo.
)

if not exist icon.ico (
  echo [2/3] 아이콘 생성 중...
  node create-icon.js
  echo.
)

echo [3/3] 관리자 실행 중...
npx electron .
