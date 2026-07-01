import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';
import type { OrdemServico } from '../types';

export function useOrdensApi() {
  return useQuery<OrdemServico[]>({
    queryKey: ['ordens-api'],
    queryFn: async () => {
      try {
        const response = await api.get<OrdemServico[]>('/ordens');
        return response.data;
      } catch (error: any) {
        const status = error.response?.status;
        const message = error.response?.data?.error || error.message || 'Erro ao carregar as ordens de serviço da API';

        console.error('Erro na chamada da API useOrdensApi:', error);

        if (status === 401) {
          toast.error('Sessão expirada ou não autorizada. Por favor, autentique-se novamente.');
        } else {
          toast.error(`Erro na API: ${message}`);
        }

        throw error;
      }
    },
  });
}
