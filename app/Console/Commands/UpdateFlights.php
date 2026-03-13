<?php

namespace App\Console\Commands;

use App\Jobs\UpdateFlightsJob;
use Illuminate\Console\Command;

class UpdateFlights extends Command
{
    /**
     * O nome e a assinatura do comando.
     */
    protected $signature = 'flights:update {--force : Executar imediatamente} {--clean : Limpar cache antigo}';

    /**
     * A descrição do comando.
     */
    protected $description = 'Dispatch job para atualizar dados de voos via WebSocket';

    /**
     * Execute o comando.
     */
    public function handle()
    {
        $this->info('🛫 Iniciando atualização de voos via WebSocket...');

        try {
            if ($this->option('force')) {
                // Executa imediatamente
                $this->info('⚡ Executando job imediatamente...');
                UpdateFlightsJob::dispatchSync();
                $this->info('✅ Job executado com sucesso!');
            } else {
                // Agenda para execução
                UpdateFlightsJob::dispatch()->onQueue('flights');
                $this->info('📝 Job agendado para execução na fila "flights"');
            }

            if ($this->option('clean')) {
                $this->info('🧹 Limpando cache antigo...');
                cache()->forget('flights_data');
                cache()->forget('flights_stats');
                cache()->forget('flights_error');
                $this->info('✅ Cache limpo!');
            }

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('❌ Erro ao processar comando: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
