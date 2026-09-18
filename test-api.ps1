$Results = @()
$ApiBaseUrl = "http://localhost:3001/api"

function Test-Api {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null
    )
    
    $Result = @{
        TestName = $Name
        Method = $Method
        Endpoint = $Endpoint
        Status = "PASS"
        Response = $null
        Error = $null
    }
    
    try {
        $Uri = "$ApiBaseUrl$Endpoint"
        $Params = @{
            Uri = $Uri
            Method = $Method
            ContentType = "application/json; charset=utf-8"
        }
        
        if ($Body) {
            $JsonBody = $Body | ConvertTo-Json -Depth 10
            $Params.Body = [System.Text.Encoding]::UTF8.GetBytes($JsonBody)
        }
        
        $Response = Invoke-RestMethod @Params
        $Result.Response = $Response
        Write-Host "[PASS] $Name" -ForegroundColor Green
    }
    catch {
        $Result.Status = "FAIL"
        $Result.Error = $_.Exception.Message
        Write-Host "[FAIL] $Name - $($_.Exception.Message)" -ForegroundColor Red
    }
    
    return $Result
}

Write-Host "`n========== API 测试开始 ==========" -ForegroundColor Cyan

Write-Host "`n--- 项目 API 测试 ---" -ForegroundColor Yellow
$Results += Test-Api -Name "获取项目列表" -Method "GET" -Endpoint "/projects"
$Results += Test-Api -Name "创建项目" -Method "POST" -Endpoint "/projects" -Body @{name="测试项目";description="测试描述";manager="测试负责人"}
$Results += Test-Api -Name "获取单个项目" -Method "GET" -Endpoint "/projects/1"
$Results += Test-Api -Name "更新项目" -Method "PUT" -Endpoint "/projects/1" -Body @{name="更新后的项目";description="更新描述";manager="新负责人"}
$Results += Test-Api -Name "删除项目" -Method "DELETE" -Endpoint "/projects/1"

Write-Host "`n--- 任务 API 测试 ---" -ForegroundColor Yellow
$Results += Test-Api -Name "获取任务列表" -Method "GET" -Endpoint "/tasks"
$Results += Test-Api -Name "创建任务" -Method "POST" -Endpoint "/tasks" -Body @{title="测试任务";description="任务描述";priority="高";status="未开始"}
$Results += Test-Api -Name "获取单个任务" -Method "GET" -Endpoint "/tasks/1"
$Results += Test-Api -Name "更新任务" -Method "PUT" -Endpoint "/tasks/1" -Body @{title="更新后的任务";description="更新描述";priority="中";status="进行中"}
$Results += Test-Api -Name "删除任务" -Method "DELETE" -Endpoint "/tasks/1"

Write-Host "`n--- 进度更新 API 测试 ---" -ForegroundColor Yellow
$Results += Test-Api -Name "创建任务用于进度测试" -Method "POST" -Endpoint "/tasks" -Body @{title="进度测试任务";description="测试进度更新";priority="中";status="未开始"}
$Results += Test-Api -Name "创建进度更新" -Method "POST" -Endpoint "/progress-updates" -Body @{taskId=999;description="进度更新描述";statusChange="进行中"}
$Results += Test-Api -Name "获取任务进度更新" -Method "GET" -Endpoint "/progress-updates/task/999"

Write-Host "`n--- 汇总报告 API 测试 ---" -ForegroundColor Yellow
$Results += Test-Api -Name "生成汇总报告" -Method "POST" -Endpoint "/summaries/generate" -Body @{startDate="2026-01-01";endDate="2026-12-31"}

Write-Host "`n--- 备份 API 测试 ---" -ForegroundColor Yellow
$Results += Test-Api -Name "获取备份列表" -Method "GET" -Endpoint "/backups"
$Results += Test-Api -Name "创建备份" -Method "POST" -Endpoint "/backups"

Write-Host "`n--- 异常处理测试 ---" -ForegroundColor Yellow
$Results += Test-Api -Name "获取不存在的任务" -Method "GET" -Endpoint "/tasks/99999"
$Results += Test-Api -Name "获取不存在的项目" -Method "GET" -Endpoint "/projects/99999"
$Results += Test-Api -Name "创建空标题任务" -Method "POST" -Endpoint "/tasks" -Body @{title="";description="测试"}

Write-Host "`n========== 测试结果汇总 ==========" -ForegroundColor Cyan
$PassCount = ($Results | Where-Object { $_.Status -eq "PASS" }).Count
$FailCount = ($Results | Where-Object { $_.Status -eq "FAIL" }).Count
Write-Host "通过: $PassCount" -ForegroundColor Green
Write-Host "失败: $FailCount" -ForegroundColor Red

Write-Host "`n详细结果:" -ForegroundColor Yellow
$Results | ForEach-Object {
    $Color = if ($_.Status -eq "PASS") { "Green" } else { "Red" }
    Write-Host "[$($_.Status)] $($_.TestName) - $($_.Method) $($_.Endpoint)" -ForegroundColor $Color
    if ($_.Error) {
        Write-Host "  错误: $($_.Error)" -ForegroundColor DarkRed
    }
}
