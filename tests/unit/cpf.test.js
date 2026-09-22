import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  REGIOES,
  calcularDigitosVerificadores,
  digitoAleatorio,
  formatarCpf,
  gerarCpf,
  gerarCpfUnico,
  limpar,
  regiaoDoCpf,
  validarCpf,
} from '../../src/core/cpf.js';

/** Devolve os dígitos da lista em sequência, repetindo se acabar. */
function sequencia(digitos) {
  let i = 0;
  return () => digitos[i++ % digitos.length];
}

describe('calcularDigitosVerificadores', () => {
  it('calcula os verificadores de um CPF conhecido (111.444.777-35)', () => {
    assert.deepEqual(calcularDigitosVerificadores('111444777'), [3, 5]);
  });

  it('calcula outro exemplo público (529.982.247-25)', () => {
    assert.deepEqual(calcularDigitosVerificadores('529982247'), [2, 5]);
  });

  it('usa 0 quando o resto da divisão por 11 é menor que 2', () => {
    assert.deepEqual(calcularDigitosVerificadores('007942757'), [0, 2]);
  });

  it('rejeita base com tamanho diferente de 9', () => {
    assert.throws(() => calcularDigitosVerificadores('123'), RangeError);
  });
});

describe('validarCpf', () => {
  it('aceita CPF válido com e sem pontuação', () => {
    assert.equal(validarCpf('111.444.777-35'), true);
    assert.equal(validarCpf('11144477735'), true);
  });

  it('recusa dígito verificador errado', () => {
    assert.equal(validarCpf('111.444.777-36'), false);
    assert.equal(validarCpf('111.444.777-45'), false);
  });

  it('recusa sequências repetidas, que passariam no cálculo', () => {
    assert.equal(validarCpf('111.111.111-11'), false);
    assert.equal(validarCpf('00000000000'), false);
  });

  it('recusa tamanho errado e valores vazios', () => {
    assert.equal(validarCpf('1234567890'), false);
    assert.equal(validarCpf(''), false);
    assert.equal(validarCpf(null), false);
  });
});

describe('formatarCpf e limpar', () => {
  it('aplica a máscara 000.000.000-00', () => {
    assert.equal(formatarCpf('11144477735'), '111.444.777-35');
  });

  it('devolve só os dígitos quando o valor está incompleto', () => {
    assert.equal(formatarCpf('111.444'), '111444');
  });

  it('remove tudo que não é dígito', () => {
    assert.equal(limpar(' 111.444.777-35 '), '11144477735');
    assert.equal(limpar(undefined), '');
  });
});

describe('regiaoDoCpf', () => {
  it('identifica a região pelo 9º dígito', () => {
    assert.equal(regiaoDoCpf('111.444.777-35'), REGIOES[7]);
    assert.equal(regiaoDoCpf('000000009'), 'PR e SC');
  });

  it('devolve null com menos de 9 dígitos', () => {
    assert.equal(regiaoDoCpf('1234'), null);
  });
});

describe('gerarCpf', () => {
  it('gera CPFs válidos de 11 dígitos', () => {
    for (let i = 0; i < 500; i += 1) {
      const cpf = gerarCpf();
      assert.match(cpf, /^\d{11}$/);
      assert.equal(validarCpf(cpf), true, `CPF inválido gerado: ${cpf}`);
    }
  });

  it('fixa a região fiscal quando informada', () => {
    for (let r = 0; r <= 9; r += 1) {
      const cpf = gerarCpf({ regiao: r });
      assert.equal(cpf[8], String(r));
      assert.equal(validarCpf(cpf), true);
    }
  });

  it('é determinístico com um sorteador controlado', () => {
    assert.equal(gerarCpf({ aleatorio: sequencia([1, 1, 1, 4, 4, 4, 7, 7, 7]) }), '11144477735');
  });

  it('descarta bases com todos os dígitos iguais', () => {
    // A primeira base sorteada seria 222222222; a segunda, 111444777.
    const aleatorio = sequencia([2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 4, 4, 4, 7, 7, 7]);
    assert.equal(gerarCpf({ aleatorio }), '11144477735');
  });

  it('rejeita região inválida', () => {
    assert.throws(() => gerarCpf({ regiao: 'SP' }), RangeError);
    assert.throws(() => gerarCpf({ regiao: 10 }), RangeError);
  });
});

describe('gerarCpfUnico', () => {
  it('nunca repete um CPF já existente', () => {
    const existentes = new Set();
    for (let i = 0; i < 300; i += 1) {
      const cpf = gerarCpfUnico(existentes);
      assert.equal(existentes.has(cpf), false);
      existentes.add(cpf);
    }
    assert.equal(existentes.size, 300);
  });

  it('considera existentes com pontuação', () => {
    const aleatorio = sequencia([1, 1, 1, 4, 4, 4, 7, 7, 7, 5, 2, 9, 9, 8, 2, 2, 4, 7]);
    const cpf = gerarCpfUnico(['111.444.777-35'], { aleatorio });
    assert.equal(cpf, '52998224725');
  });

  it('falha de forma explícita quando não há CPF inédito possível', () => {
    const aleatorio = sequencia([1, 1, 1, 4, 4, 4, 7, 7, 7]);
    assert.throws(() => gerarCpfUnico(['11144477735'], { aleatorio }, 5), /inédito/);
  });
});

describe('digitoAleatorio', () => {
  it('devolve inteiros de 0 a 9', () => {
    for (let i = 0; i < 200; i += 1) {
      const d = digitoAleatorio();
      assert.ok(Number.isInteger(d) && d >= 0 && d <= 9);
    }
  });

  it('funciona sem crypto (usa Math.random)', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    try {
      const d = digitoAleatorio();
      assert.ok(d >= 0 && d <= 9);
    } finally {
      Object.defineProperty(globalThis, 'crypto', original);
    }
  });
});
