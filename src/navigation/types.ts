export type PlanilhaFormParams = {
  tipoModulo: "candombles" | "geral";
  orixaId: number | null;
  categoriaId: number | null;
  templateId?: number;
  templateNome?: string;
};

export type PlanilhaRoutes = {
  PlanilhaDetail: { planilhaId: number };
  PlanilhaForm: PlanilhaFormParams;
};
