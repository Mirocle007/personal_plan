$Results = @()
$ApiBaseUrl = "http://localhost:3001/api"

function Test-Api {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null,
        [int]$ExpectedStatus = 200
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

function Test-ApiError {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null,
        [int]$ExpectedStatus = 400
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
        $Result.Status = "FAIL"
        $Result.Error = "Expected error but got success"
        Write-Host "[FAIL] $Name - Expected error but got success" -ForegroundColor Red
    }
    catch {
        if ($_.Exception.Response.StatusCode.value__ -eq $ExpectedStatus) {
            Write-Host "[PASS] $Name (Expected error $ExpectedStatus)" -ForegroundColor Green
        } else {
            $Result.Status = "FAIL"
            $Result.Error = "Expected status $ExpectedStatus but got $($_.Exception.Response.StatusCode.value__)"
            Write-Host "[FAIL] $Name - Expected status $ExpectedStatus but got $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
        }
    }
    
    return $Result
}

Write-Host "`n========== 回归测试开始 ==========" -ForegroundColor Cyan

Write-Host "`n--- 统计 API 测试 ---" -ForegroundColor Yellow
$Results += Test-Api -Name "获取统计数据" -Method "GET" -Endpoint "/stats"

Write-Host "`n--- 参数验证测试 ---" -ForegroundColor Yellow
$Results += Test-ApiError -Name "创建空标题任务(应失败)" -Method "POST" -Endpoint "/tasks" -Body @{title="";description="测试"} -ExpectedStatus 400
$Results += Test-ApiError -Name "创建空标题项目(应失败)" -Method "POST" -Endpoint "/projects" -Body @{name=""} -ExpectedStatus 400
$Results += Test-ApiError -Name "创建无效优先级任务(应失败)" -Method "POST" -Endpoint "/tasks" -Body @{title="测试";priority="无效"} -ExpectedStatus 400

Write-Host "`n--- 正常 CRUD 测试 ---" -ForegroundColor Yellow
$Results += Test-Api -Name "创建项目" -Method "POST" -Endpoint "/projects" -Body @{name="回归测试项目";description="测试描述";manager="测试负责人"}
$Results += Test-Api -Name "获取项目列表" -Method "GET" -Endpoint "/projects"
$Results += Test-Api -Name "创建任务" -Method "POST" -Endpoint "/tasks" -Body @{title="回归测试任务";description="任务描述";priority="高";status="未开始"}
$Results += Test-Api -Name "获取任务列表" -Method "GET" -Endpoint "/tasks"
$Results += Test-Api -Name "更新任务" -Method "PUT" -Endpoint "/tasks/1" -Body @{title="更新后的任务";description="更新描述";priority="中";status="进行中"}

Write-Host "`n--- 备份功能测试 ---" -ForegroundColor Yellow
$Results += Test-Api -Name "获取备份列表" -Method "GET" -Endpoint "/backups"
$Results += Test-Api -Name "创建备份" -Method "POST" -Endpoint "/backups"

Write-Host "`n--- 汇总报告测试 ---" -ForegroundColor Yellow
$Results += Test-Api -Name "生成汇总报告" -Method "POST" -Endpoint "/summaries/generate" -Body @{startDate="2026-01-01";endDate="2026-12-31"}

Write-Host "`n========== 测试结果汇总 ==========" -ForegroundColor Cyan
$PassCount = ($Results | Where-Object { $_.Status -eq "PASS" }).Count
$FailCount = ($Results | Where-Object { $_.Status -eq "FAIL" }).Count
Write-Host "通过: $PassCount" -ForegroundColor Green
Write-Host "失败: $FailCount" -ForegroundColor Red

if ($FailCount -eq 0) {
    Write-Host "`n所有回归测试通过!" -ForegroundColor Green
} else {
    Write-Host "`n存在失败的测试，请检查以下问题:" -ForegroundColor Yellow
    $Results | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
        Write-Host "  - $($_.TestName): $($_.Error)" -ForegroundColor Red
    }
}
