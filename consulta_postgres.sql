SELECT
    SUM(i.quantidade) AS quantidade_entradas_pendentes
FROM z_dw_026_itens i
JOIN z_dw_026_capas c
    ON c.chave_entrada = i.chave_entrada
   AND c.filial_entrada = i.filial_entrada
WHERE c.situacao = 'PENDENTE'
  AND c.operacao_entrada = 'Entrada por COMPRA'
  AND EXTRACT(YEAR FROM c.data_emissao) = EXTRACT(YEAR FROM CURRENT_DATE);
