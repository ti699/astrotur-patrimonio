export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          address: string | null
          cnpj: string | null
          company_name: string
          currency: string
          dark_mode: boolean
          email: string | null
          id: string
          items_per_page: number
          logo_url: string | null
          patrimonio_prefix: string
          phone: string | null
          primary_color: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          company_name?: string
          currency?: string
          dark_mode?: boolean
          email?: string | null
          id?: string
          items_per_page?: number
          logo_url?: string | null
          patrimonio_prefix?: string
          phone?: string | null
          primary_color?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          company_name?: string
          currency?: string
          dark_mode?: boolean
          email?: string | null
          id?: string
          items_per_page?: number
          logo_url?: string | null
          patrimonio_prefix?: string
          phone?: string | null
          primary_color?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      documentos: {
        Row: {
          categoria: string
          created_at: string
          data_upload: string
          id: string
          nome_arquivo: string
          patrimonio_id: string
          storage_path: string
          tamanho: number | null
          tipo: string
          url: string
          usuario_upload: string | null
        }
        Insert: {
          categoria?: string
          created_at?: string
          data_upload?: string
          id?: string
          nome_arquivo: string
          patrimonio_id: string
          storage_path: string
          tamanho?: number | null
          tipo: string
          url: string
          usuario_upload?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string
          data_upload?: string
          id?: string
          nome_arquivo?: string
          patrimonio_id?: string
          storage_path?: string
          tamanho?: number | null
          tipo?: string
          url?: string
          usuario_upload?: string | null
        }
        Relationships: []
      }
      historico_patrimonio: {
        Row: {
          acao: string
          categoria: string | null
          codigo: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string | null
          patrimonio_id: string | null
          usuario_id: string | null
          valor: number | null
        }
        Insert: {
          acao: string
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string | null
          patrimonio_id?: string | null
          usuario_id?: string | null
          valor?: number | null
        }
        Update: {
          acao?: string
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string | null
          patrimonio_id?: string | null
          usuario_id?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_patrimonio_patrimonio_id_fkey"
            columns: ["patrimonio_id"]
            isOneToOne: false
            referencedRelation: "patrimonios"
            referencedColumns: ["id"]
          },
        ]
      }
      inventarios: {
        Row: {
          created_at: string
          data_verificacao: string
          id: string
          observacao: string | null
          patrimonio_id: string
          sessao_id: string | null
          status_verificacao: string
          usuario_responsavel: string | null
        }
        Insert: {
          created_at?: string
          data_verificacao?: string
          id?: string
          observacao?: string | null
          patrimonio_id: string
          sessao_id?: string | null
          status_verificacao?: string
          usuario_responsavel?: string | null
        }
        Update: {
          created_at?: string
          data_verificacao?: string
          id?: string
          observacao?: string | null
          patrimonio_id?: string
          sessao_id?: string | null
          status_verificacao?: string
          usuario_responsavel?: string | null
        }
        Relationships: []
      }
      manutencoes: {
        Row: {
          created_at: string
          custo: number | null
          data_conclusao: string | null
          data_inicio: string
          descricao: string | null
          fornecedor: string | null
          id: string
          observacoes: string | null
          patrimonio_id: string
          status: string
          tecnico: string | null
          tipo: string
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          custo?: number | null
          data_conclusao?: string | null
          data_inicio?: string
          descricao?: string | null
          fornecedor?: string | null
          id?: string
          observacoes?: string | null
          patrimonio_id: string
          status?: string
          tecnico?: string | null
          tipo?: string
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          custo?: number | null
          data_conclusao?: string | null
          data_inicio?: string
          descricao?: string | null
          fornecedor?: string | null
          id?: string
          observacoes?: string | null
          patrimonio_id?: string
          status?: string
          tecnico?: string | null
          tipo?: string
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_patrimonio_id_fkey"
            columns: ["patrimonio_id"]
            isOneToOne: false
            referencedRelation: "patrimonios"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes: {
        Row: {
          created_at: string
          data_movimentacao: string
          id: string
          localizacao_destino: string | null
          localizacao_origem: string | null
          motivo: string | null
          observacoes: string | null
          patrimonio_id: string
          responsavel_destino_id: string | null
          responsavel_origem_id: string | null
          setor_destino_id: string | null
          setor_origem_id: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          data_movimentacao?: string
          id?: string
          localizacao_destino?: string | null
          localizacao_origem?: string | null
          motivo?: string | null
          observacoes?: string | null
          patrimonio_id: string
          responsavel_destino_id?: string | null
          responsavel_origem_id?: string | null
          setor_destino_id?: string | null
          setor_origem_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          data_movimentacao?: string
          id?: string
          localizacao_destino?: string | null
          localizacao_origem?: string | null
          motivo?: string | null
          observacoes?: string | null
          patrimonio_id?: string
          responsavel_destino_id?: string | null
          responsavel_origem_id?: string | null
          setor_destino_id?: string | null
          setor_origem_id?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_patrimonio_id_fkey"
            columns: ["patrimonio_id"]
            isOneToOne: false
            referencedRelation: "patrimonios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_responsavel_destino_id_fkey"
            columns: ["responsavel_destino_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_responsavel_origem_id_fkey"
            columns: ["responsavel_origem_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_setor_destino_id_fkey"
            columns: ["setor_destino_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_setor_origem_id_fkey"
            columns: ["setor_origem_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      patrimonios: {
        Row: {
          categoria: string
          codigo: string
          created_at: string
          created_by: string | null
          data_aquisicao: string | null
          data_compra: string | null
          data_fim_garantia: string | null
          data_inicio_garantia: string | null
          descricao: string | null
          estado_conservacao: string
          fornecedor: string | null
          foto_url: string | null
          garantia_ate: string | null
          id: string
          localizacao: string | null
          marca: string | null
          modelo: string | null
          nome: string
          numero_garantia: string | null
          numero_serie: string | null
          observacoes: string | null
          responsavel_id: string | null
          setor_id: string | null
          specs: Json | null
          status: string
          subcategoria: string | null
          tag_empresa: string | null
          updated_at: string
          valor_aquisicao: number | null
          valor_atual: number | null
        }
        Insert: {
          categoria: string
          codigo: string
          created_at?: string
          created_by?: string | null
          data_aquisicao?: string | null
          data_compra?: string | null
          data_fim_garantia?: string | null
          data_inicio_garantia?: string | null
          descricao?: string | null
          estado_conservacao?: string
          fornecedor?: string | null
          foto_url?: string | null
          garantia_ate?: string | null
          id?: string
          localizacao?: string | null
          marca?: string | null
          modelo?: string | null
          nome: string
          numero_garantia?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          responsavel_id?: string | null
          setor_id?: string | null
          specs?: Json | null
          status?: string
          subcategoria?: string | null
          tag_empresa?: string | null
          updated_at?: string
          valor_aquisicao?: number | null
          valor_atual?: number | null
        }
        Update: {
          categoria?: string
          codigo?: string
          created_at?: string
          created_by?: string | null
          data_aquisicao?: string | null
          data_compra?: string | null
          data_fim_garantia?: string | null
          data_inicio_garantia?: string | null
          descricao?: string | null
          estado_conservacao?: string
          fornecedor?: string | null
          foto_url?: string | null
          garantia_ate?: string | null
          id?: string
          localizacao?: string | null
          marca?: string | null
          modelo?: string | null
          nome?: string
          numero_garantia?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          responsavel_id?: string | null
          setor_id?: string | null
          specs?: Json | null
          status?: string
          subcategoria?: string | null
          tag_empresa?: string | null
          updated_at?: string
          valor_aquisicao?: number | null
          valor_atual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patrimonios_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrimonios_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cargo: string | null
          created_at: string
          email: string
          id: string
          nome: string
          role: Database["public"]["Enums"]["app_role"]
          setor: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email: string
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["app_role"]
          setor?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["app_role"]
          setor?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      responsaveis: {
        Row: {
          cargo: string | null
          contato_email: string | null
          contato_telefone: string | null
          created_at: string
          id: string
          nome: string
          setor_id: string | null
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          contato_email?: string | null
          contato_telefone?: string | null
          created_at?: string
          id?: string
          nome: string
          setor_id?: string | null
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          contato_email?: string | null
          contato_telefone?: string | null
          created_at?: string
          id?: string
          nome?: string
          setor_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "responsaveis_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      setores: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_patrimonio_codigo: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
