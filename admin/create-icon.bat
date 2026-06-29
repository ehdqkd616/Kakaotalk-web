@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo =============================================
echo  KakaoTalk Web 관리자 - 아이콘 생성기
echo =============================================
echo.

if not exist node_modules (
  echo [1/2] 패키지 설치 중...
  npm install
  if errorlevel 1 (
    echo 패키지 설치 실패
    pause
    exit /b 1
  )
  echo.
)

echo [2/2] 아이콘 생성 중...
node create-icon.js
if errorlevel 1 (
  echo 아이콘 생성 실패
  pause
  exit /b 1
)

echo.
pause
