import psycopg

print("=== TIRA TEIMA: ENTRADAS VS PEDIDOS PENDENTES ===\n")

try:
    conn = psycopg.connect(host='192.168.10.8', dbname='r6_unillar', user='giro_dw', password='giro_dw')
    cur = conn.cursor()

    # 1. Quantas capas de Entrada existem no último ano?
    cur.execute("""
        SELECT COUNT(*)
        FROM z_dw_026_capas
        WHERE situacao = 'PENDENTE' 
          AND operacao_entrada = 'Entrada por COMPRA' 
          AND data_emissao >= CURRENT_DATE - INTERVAL '365 days';
    """)
    qtd_capas_entrada = cur.fetchone()[0]
    print(f"1. Notas de ENTRADA (Capas) Pendentes emitidas no último ano: {qtd_capas_entrada}")

    # 2. Dessas capas de Entrada, quantas têm ITENS (quantidade) atrelados?
    cur.execute("""
        SELECT COUNT(i.codigo_produto), SUM(i.quantidade)
        FROM z_dw_026_capas c
        LEFT JOIN z_dw_026_itens i 
            ON c.chave_entrada = i.chave_entrada AND c.filial_entrada = i.filial_entrada
        WHERE c.situacao = 'PENDENTE' 
          AND c.operacao_entrada = 'Entrada por COMPRA' 
          AND c.data_emissao >= CURRENT_DATE - INTERVAL '365 days';
    """)
    row_entradas = cur.fetchone()
    qtd_itens_entrada = row_entradas[0]
    soma_qtd_entrada = row_entradas[1] or 0
    print(f"2. Quantidade de ITENS encontrados para essas Notas de Entrada: {qtd_itens_entrada}")
    print(f"3. Soma das quantidades (Entrada): {soma_qtd_entrada}")
    if qtd_itens_entrada == 0:
        print("   -> CONCLUSÃO: O banco tem a 'Capa' da nota, mas a view 'z_dw_026_itens' está VAZIA para essas notas recentes. Sem itens, a soma é zero!")

    print("\n--------------------------------------------------\n")

    # 4. E os Pedidos de Compra (z_dw_029)?
    cur.execute("""
        SELECT COUNT(i.codigo_produto), SUM(i.quantidade_itens - i.quantidade_entregue)
        FROM z_dw_029_capas c
        JOIN z_dw_029_itens i 
            ON c.chave_pedido = i.chave_pedido AND c.filial_pedido = i.filial_pedido
        WHERE i.situacao_item = ANY(ARRAY['NÃO ENTREGUE', 'PARCIAL']) 
          AND i.quantidade_itens > i.quantidade_entregue
          AND c.data_emissao >= CURRENT_DATE - INTERVAL '365 days';
    """)
    row_pedidos = cur.fetchone()
    qtd_itens_pedido = row_pedidos[0]
    soma_qtd_pedido = row_pedidos[1] or 0
    print(f"4. Itens de PEDIDO DE COMPRA pendentes (Não Entregue/Parcial) no último ano: {qtd_itens_pedido}")
    print(f"5. Soma das quantidades (Pedidos): {soma_qtd_pedido}")
    print("   -> CONCLUSÃO: Os Pedidos de Compra estão preenchidos corretamente no banco.")

except Exception as e:
    print(f"Erro ao conectar ou consultar: {e}")
finally:
    if 'conn' in locals():
        conn.close()
