try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/realtime/test" -Method GET
    Write-Host "✅ Teste de conexão bem-sucedido!" -ForegroundColor Green
    Write-Host "Resultado:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Erro no teste de conexão:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
