<?php

namespace App\Console\Commands;

use App\Services\OpenSkyService;
use Illuminate\Console\Command;

class UpdateFlights extends Command
{
    /**
     * O nome e a assinatura do comando.
     */
    protected $signature = 'flights:update {--clean : Limpar voos antigos após atualização}';

    /**
     * A descrição do comando.
     */
    protected $description = 'Atualiza dados de voos da API OpenSky Network';

    /**
     * Execute o comando.
     */
    public function handle(OpenSkyService $service)
    {
        $this->info('🛫 Atualizando dados de voos da OpenSky Network...');

        try {
            // Atualiza os voos
            $result = $service->updateFlights();

            $this->info("✅ Atualização concluída:");
            $this->line("   Total recebidos: {$result['total']}");
            $this->line("   Novos voos: {$result['saved']}");
            $this->line("   Voos atualizados: {$result['updated']}");

            // Limpa voos antigos se solicitado
            if ($this->option('clean')) {
                $this->info('🧹 Limpando voos antigos...');
                $deleted = $service->cleanOldFlights();
                $this->line("   Voos removidos: {$deleted}");
            }

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('❌ Erro ao atualizar voos: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
