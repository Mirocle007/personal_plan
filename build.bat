@echo off
chcp 65001 >nul
echo ========================================
echo   个人规划中心 v2 - 生产构建
echo ========================================

cd /d "%~dp0frontend"
echo [1/2] 构建前端...
call npm install --legacy-peer-deps
call npm run build
if errorlevel 1 (
  echo 前端构建失败！
  pause
  exit /b 1
)

cd /d "%~dp0backend"
echo [2/2] 检查后端依赖...
call npm install
echo.
echo 构建完成！运行 start-prod.bat 启动生产服务（单端口 3001）。
pause
