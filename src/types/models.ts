export type TipoModulo =
  | "mensalidades"
  | "candombles"
  | "produtos"
  | "geral";

export type TipoLinha = "entrada" | "saida";

export type StatusPagamento = "pago" | "parcial" | "pendente" | "doado";

export interface Planilha {
  id: number;
  nome: string;
  tipo_modulo: TipoModulo;
  orixa_id: number | null;
  categoria_id: number | null;
  mes: number | null;
  ano: number | null;
  created_at: string;
}

export interface LinhaPlanilha {
  id: number;
  planilha_id: number;
  nome: string;
  valor: number;
  valor_cobrado: number;
  valor_pago: number;
  tipo: TipoLinha;
  status: StatusPagamento;
  data: string | null;
  observacao: string | null;
}

export interface Mensalidade {
  id: number;
  mes: number;
  ano: number;
  membro_id: number;
  valor: number;
  status: StatusPagamento;
  data_pagamento: string | null;
}

export interface Membro {
  id: number;
  nome: string;
  ativo: number;
}

export interface Categoria {
  id: number;
  nome: string;
  pai_id: number | null;
  orixa_id: number | null;
}

export interface Template {
  id: number;
  nome: string;
  created_at: string;
}

export interface TemplateLinha {
  id: number;
  template_id: number;
  nome: string;
  tipo: TipoLinha;
  valor_padrao: number;
  observacao: string | null;
}

export interface Orixa {
  id: number;
  nome: string;
}

export interface Configuracao {
  chave: string;
  valor: string;
}

export const ORIXAS_PADRAO = [
  "Oxalá",
  "Ogun",
  "Oyá",
  "Odé",
  "Oxum",
  "Omolu",
] as const;

export type OrixaPadrao = (typeof ORIXAS_PADRAO)[number];
