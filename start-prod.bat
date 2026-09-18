@echo off
chcp 65001 >nul
echo ========================================
echo   个人规划中心 v2 - 生产模式启动
echo ========================================

cd /d "%~dp0backend"
set NODE_ENV=production
set PORT=3001
echo 启动中... 打开 http://localhost:3001
echo 按 Ctrl+C 停止服务
call npx ts-node src/index.ts
pause
