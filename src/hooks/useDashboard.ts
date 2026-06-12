import { useCallback, useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";

export type DashboardResumo = {
  mensalidades: {
    qtdTotal: number;
    qtdPagos: number;
    totalArrecadado: number;
    totalPendente: number;
    adimplenciaPercent: number;
  };
  produtos: {
    qtdTotal: number;
    qtdPagos: number;
    totalArrecadado: number;
    totalPendente: number;
    adimplenciaPercent: number;
  };
  pendenciasTotal: number;
};

const EMPTY_RESUMO: DashboardResumo = {
  mensalidades: {
    qtdTotal: 0,
    qtdPagos: 0,
    totalArrecadado: 0,
    totalPendente: 0,
    adimplenciaPercent: 0,
  },
  produtos: {
    qtdTotal: 0,
    qtdPagos: 0,
    totalArrecadado: 0,
    totalPendente: 0,
    adimplenciaPercent: 0,
  },
  pendenciasTotal: 0,
};

export type UseDashboardResult = {
  resumo: DashboardResumo;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

type MensalidadeAgg = {
  qtdTotal: number | null;
  qtdPagos: number | null;
  totalArrecadado: number | null;
  totalPendente: number | null;
};

type ConfigRow = {
  valor: string | null;
};

type ProdutoAgg = {
  qtdItens: number | null;
  qtdPagos: number | null;
  totalArrecadado: number | null;
  totalPendente: number | null;
};

export function useDashboard(mes: number, ano: number): UseDashboardResult {
  const db = useSQLiteContext();
  const [resumo, setResumo] = useState<DashboardResumo>(EMPTY_RESUMO);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const configMens = await db.getFirstAsync<ConfigRow>(
        `SELECT valor FROM configuracoes WHERE chave = 'valor_padrao_mensalidade'`
      );
      const valorPadraoMens = parseFloat(configMens?.valor ?? "0") || 0;

      const configProd = await db.getFirstAsync<ConfigRow>(
        `SELECT valor FROM configuracoes WHERE chave = 'valor_padrao_produto'`
      );
      const valorPadraoProd = parseFloat(configProd?.valor ?? "0") || 0;

      const mensalidadeRow = await db.getFirstAsync<MensalidadeAgg>(
        `SELECT
           COUNT(DISTINCT m.id) AS qtdTotal,
           SUM(CASE WHEN ms.status = 'pago' THEN 1 ELSE 0 END) AS qtdPagos,
           COALESCE(SUM(CASE WHEN ms.status = 'pago' THEN ms.valor ELSE 0 END), 0) AS totalArrecadado,
           COALESCE(SUM(CASE WHEN ms.id IS NULL OR ms.status != 'pago'
             THEN COALESCE(ms.valor, ?)
             ELSE 0 END), 0) AS totalPendente
         FROM membros m
         LEFT JOIN mensalidades ms
           ON ms.membro_id = m.id AND ms.mes = ? AND ms.ano = ?
         WHERE m.ativo = 1 OR ms.id IS NOT NULL`,
        valorPadraoMens,
        mes,
        ano
      );

      const produtoRow = await db.getFirstAsync<ProdutoAgg>(
        `SELECT
           COUNT(DISTINCT m.id) AS qtdItens,
           SUM(CASE WHEN pl.status IN ('pago', 'doado') THEN 1 ELSE 0 END) AS qtdPagos,
           COALESCE(SUM(CASE WHEN pl.status IN ('pago', 'doado') THEN COALESCE(pl.valor_cobrado, ?) ELSE 0 END), 0) AS totalArrecadado,
           COALESCE(SUM(CASE
             WHEN pl.id IS NULL THEN ?
             WHEN pl.status = 'parcial' THEN pl.valor_cobrado - pl.valor_pago
             WHEN pl.status NOT IN ('pago', 'doado') THEN pl.valor_cobrado
             ELSE 0
           END), 0) AS totalPendente
         FROM membros m
         LEFT JOIN produtos_limpeza pl
           ON pl.membro_id = m.id AND pl.mes = ? AND pl.ano = ?
         WHERE m.ativo = 1 OR pl.id IS NOT NULL`,
        valorPadraoProd,
        valorPadraoProd,
        mes,
        ano
      );

      const qtdTotalMens = mensalidadeRow?.qtdTotal ?? 0;
      const qtdPagosMens = mensalidadeRow?.qtdPagos ?? 0;
      const totalArrecadadoMens = mensalidadeRow?.totalArrecadado ?? 0;
      const totalPendenteMens = mensalidadeRow?.totalPendente ?? 0;
      const adimplenciaMens =
        qtdTotalMens === 0 ? 0 : (qtdPagosMens / qtdTotalMens) * 100;

      const qtdTotalProd = produtoRow?.qtdItens ?? 0;
      const qtdPagosProd = produtoRow?.qtdPagos ?? 0;
      const totalArrecadadoProd = produtoRow?.totalArrecadado ?? 0;
      const totalPendenteProd = produtoRow?.totalPendente ?? 0;
      const adimplenciaProd =
        qtdTotalProd === 0 ? 0 : (qtdPagosProd / qtdTotalProd) * 100;

      const qtdPendentesMens = qtdTotalMens - qtdPagosMens;
      const qtdPendentesProd = qtdTotalProd - qtdPagosProd;

      setResumo({
        mensalidades: {
          qtdTotal: qtdTotalMens,
          qtdPagos: qtdPagosMens,
          totalArrecadado: totalArrecadadoMens,
          totalPendente: totalPendenteMens,
          adimplenciaPercent: adimplenciaMens,
        },
        produtos: {
          qtdTotal: qtdTotalProd,
          qtdPagos: qtdPagosProd,
          totalArrecadado: totalArrecadadoProd,
          totalPendente: totalPendenteProd,
          adimplenciaPercent: adimplenciaProd,
        },
        pendenciasTotal: qtdPendentesMens + qtdPendentesProd,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar resumo");
    } finally {
      setLoading(false);
    }
  }, [db, mes, ano]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { resumo, loading, error, reload };
}
