# Teste de conexão OpenSky Network
Write-Host "🔗 Testando conexão local..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/realtime/test" -Method GET -TimeoutSec 30 -UseBasicParsing
    Write-Host "✅ Resposta recebida (Status: $($response.StatusCode))" -ForegroundColor Green
    Write-Host "📄 Conteúdo:" -ForegroundColor Cyan
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ Erro na requisição: $($_.Exception.Message)" -ForegroundColor Red
}
