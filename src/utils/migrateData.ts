import api from '../services/api';
import { toast } from 'sonner';

export async function migrateLocalData(): Promise<boolean> {
  try {
    const perfilId = sessionStorage.getItem('wrapos_perfil_ativo') ?? '_';
    const clientesKey = `wrapos_perfil_${perfilId}_clientes`;
    const veiculosKey = `wrapos_perfil_${perfilId}_veiculos`;
    const ordensKey = `wrapos_perfil_${perfilId}_ordens`;

    const clientesRaw = localStorage.getItem(clientesKey);
    const veiculosRaw = localStorage.getItem(veiculosKey);
    const ordensRaw = localStorage.getItem(ordensKey);

    const clientes = clientesRaw ? JSON.parse(clientesRaw) : [];
    const veiculos = veiculosRaw ? JSON.parse(veiculosRaw) : [];
    const ordens = ordensRaw ? JSON.parse(ordensRaw) : [];

    if (clientes.length === 0 && veiculos.length === 0 && ordens.length === 0) {
      console.log('Nenhum dado local encontrado para migração.');
      return false;
    }

    const payload = {
      clientes,
      veiculos,
      ordens,
    };

    const response = await api.post('/migrate-data', payload);

    if (response.status === 200) {
      // Limpa os dados do localStorage localmente somente após confirmação do servidor (status 200)
      localStorage.removeItem(clientesKey);
      localStorage.removeItem(veiculosKey);
      localStorage.removeItem(ordensKey);
      toast.success('Migração de dados concluída com sucesso!');
      return true;
    } else {
      throw new Error(`Servidor retornou status ${response.status}`);
    }
  } catch (error: any) {
    console.error('Erro na migração de dados:', error);
    toast.error(`Falha na migração: ${error.message || 'Erro de conexão'}`);
    return false;
  }
}
