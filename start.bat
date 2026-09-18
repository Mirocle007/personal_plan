@echo off

REM 个人工作事项管理工具一键启动脚本

REM 检查Node.js是否安装
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未检测到Node.js，请先安装Node.js
    pause
    exit /b 1
)

echo 正在启动个人工作事项管理工具...
echo ================================

REM 启动后端服务
start "后端服务" cmd /k "cd backend && npm install && npm start"

REM 等待3秒让后端服务启动
ping 127.0.0.1 -n 4 >nul

REM 启动前端服务
start "前端服务" cmd /k "cd frontend && npm install --legacy-peer-deps && npm run dev"

echo ================================
echo 服务启动完成！
echo 前端地址: http://localhost:5173
echo 后端地址: http://localhost:3001
echo 按任意键退出...
pause >nul
