import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CHAVE_PADRAO, ErroHistorico, criarHistorico } from '../../src/core/historico.js';

function storageFalso(inicial = {}) {
  const dados = { ...inicial };
  return {
    dados,
    getItem: (k) => (k in dados ? dados[k] : null),
    setItem: (k, v) => {
      dados[k] = String(v);
    },
  };
}

describe('criarHistorico', () => {
  let storage;
  let historico;

  beforeEach(() => {
    storage = storageFalso();
    historico = criarHistorico(storage, { relogio: () => 1_700_000_000_000 });
  });

  it('adiciona CPFs e guarda o mais recente no topo', () => {
    historico.adicionar({ cpf: '111.444.777-35' });
    historico.adicionar({ cpf: '52998224725', origem: 'manual', nota: '  cliente teste  ' });

    const [primeiro, segundo] = historico.listar();
    assert.equal(primeiro.cpf, '52998224725');
    assert.equal(primeiro.origem, 'manual');
    assert.equal(primeiro.nota, 'cliente teste');
    assert.equal(segundo.cpf, '11144477735');
    assert.equal(historico.tamanho(), 2);
  });

  it('persiste no storage e recarrega em uma nova instância', () => {
    historico.adicionar({ cpf: '11144477735' });
    const recarregado = criarHistorico(storage);
    assert.equal(recarregado.tamanho(), 1);
    assert.ok(storage.dados[CHAVE_PADRAO].includes('11144477735'));
  });

  it('não aceita CPF repetido, mesmo com pontuação diferente', () => {
    historico.adicionar({ cpf: '11144477735' });
    assert.throws(
      () => historico.adicionar({ cpf: '111.444.777-35' }),
      (erro) => erro instanceof ErroHistorico && erro.codigo === 'duplicado',
    );
  });

  it('não aceita CPF com tamanho errado', () => {
    assert.throws(
      () => historico.adicionar({ cpf: '123' }),
      (erro) => erro.codigo === 'formato',
    );
  });

  it('aceita anotar um CPF inválido, marcando como inválido', () => {
    const item = historico.adicionar({ cpf: '12345678900', origem: 'manual' });
    assert.equal(item.valido, false);
  });

  it('informa se contém e devolve o conjunto de CPFs', () => {
    historico.adicionar({ cpf: '11144477735' });
    assert.equal(historico.contem('111.444.777-35'), true);
    assert.equal(historico.contem('52998224725'), false);
    assert.deepEqual([...historico.cpfs()], ['11144477735']);
  });

  it('remove um item pelo id e limpa tudo', () => {
    const a = historico.adicionar({ cpf: '11144477735' });
    historico.adicionar({ cpf: '52998224725' });
    assert.equal(historico.remover(a.id), true);
    assert.equal(historico.remover('nao-existe'), false);
    assert.equal(historico.tamanho(), 1);
    historico.limpar();
    assert.equal(historico.tamanho(), 0);
  });

  it('exporta um CPF por linha, com nota quando houver', () => {
    historico.adicionar({ cpf: '11144477735' });
    historico.adicionar({ cpf: '52998224725', nota: 'teste' });
    assert.equal(historico.exportarTexto(), '529.982.247-25\tteste\n111.444.777-35');
    assert.equal(historico.exportarTexto({ formatado: false }), '52998224725\tteste\n11144477735');
  });

  it('ignora dados corrompidos no storage', () => {
    const corrompido = criarHistorico(storageFalso({ [CHAVE_PADRAO]: '{isso não é json' }));
    assert.equal(corrompido.tamanho(), 0);
    const naoLista = criarHistorico(storageFalso({ [CHAVE_PADRAO]: '{"a":1}' }));
    assert.equal(naoLista.tamanho(), 0);
  });

  it('continua funcionando quando o storage falha ao gravar', () => {
    const quebrado = {
      getItem: () => null,
      setItem: () => {
        throw new Error('cota excedida');
      },
    };
    const h = criarHistorico(quebrado);
    h.adicionar({ cpf: '11144477735' });
    assert.equal(h.tamanho(), 1);
  });

  it('funciona sem storage (modo somente memória)', () => {
    const h = criarHistorico(undefined);
    h.adicionar({ cpf: '11144477735' });
    assert.equal(h.tamanho(), 1);
  });
});
