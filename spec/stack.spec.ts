import { describe, expect, it } from 'vitest';

import { assembleStack, disassembleStack } from '#stack';

import type { StackBlock } from '#stack';

const stack =
  'Error0: message0\n' +
  '    at /src0:0:0\n' +
  '    at file:///src1:1:1\n' +
  'Error1: message1\n' +
  '    at entry1 (src1:1:0)\n' +
  '    at entry2 (src2:2:0)\n' +
  'Error2: message2\n' +
  '    at entry3 (src3:3:0)\n' +
  '    at entry4 (src4:4:0)';

const components: StackBlock[] = [
  {
    type: 'description',
    name: 'Error0',
    message: 'message0',
  },
  {
    type: 'location',
    entry: '',
    location: '/src0',
    line: 0,
    column: 0,
  },
  {
    type: 'location',
    entry: '',
    location: 'file:///src1',
    line: 1,
    column: 1,
  },
  {
    type: 'description',
    name: 'Error1',
    message: 'message1',
  },
  {
    type: 'location',
    entry: 'entry1',
    location: 'src1',
    line: 1,
    column: 0,
  },
  {
    type: 'location',
    entry: 'entry2',
    location: 'src2',
    line: 2,
    column: 0,
  },
  {
    type: 'description',
    name: 'Error2',
    message: 'message2',
  },
  {
    type: 'location',
    entry: 'entry3',
    location: 'src3',
    line: 3,
    column: 0,
  },
  {
    type: 'location',
    entry: 'entry4',
    location: 'src4',
    line: 4,
    column: 0,
  },
];

describe('fn:assembleStack', () => {
  it('should reassemble a stack content', () => {
    const expected = stack;

    const result = assembleStack(components);

    expect(result).toEqual(expected);
  });

  it('should reassemble async, constructor, method and aliased frames with their name text', () => {
    const expected =
      'Error: boom\n' +
      '    at Repository.load (file:///app/repository.js:3:18)\n' +
      '    at new Repository (file:///app/repository.js:2:24)\n' +
      '    at Object.<anonymous> (/app/index.js:6:31)\n' +
      '    at Service.fetch [as get] (/app/service.js:4:5)\n' +
      '    at async main (file:///app/index.js:9:3)';

    const result = assembleStack(disassembleStack(expected));

    expect(result).toEqual(expected);
  });
});

describe('fn:disassembleStack', () => {
  it('should disassemble a stack content', () => {
    const expected = components;

    const result = disassembleStack(stack);

    expect(result).toEqual(expected);
  });

  it('should disassemble a stack content with unknown lines ignored', () => {
    const expected = components;

    const result = disassembleStack(stack + `\nunrecognized line`);

    expect(result).toEqual(expected);
  });

  it('should disassemble a description with a multi-word message', () => {
    const result = disassembleStack('Error: something went wrong');

    expect(result).toEqual([
      { type: 'description', name: 'Error', message: 'something went wrong' },
    ]);
  });

  it('should disassemble a description with no message', () => {
    const result = disassembleStack('Error');

    expect(result).toEqual([
      { type: 'description', name: 'Error', message: '' },
    ]);
  });

  it('should disassemble an async frame', () => {
    const result = disassembleStack(
      '    at async main (file:///app/index.js:9:3)',
    );

    expect(result).toEqual([
      {
        type: 'location',
        entry: 'async main',
        location: 'file:///app/index.js',
        line: 9,
        column: 3,
      },
    ]);
  });

  it('should disassemble an anonymous async frame without taking the async marker as part of the location', () => {
    const result = disassembleStack('    at async file:///app/index.js:11:7');

    expect(result).toEqual([
      {
        type: 'location',
        entry: 'async',
        location: 'file:///app/index.js',
        line: 11,
        column: 7,
      },
    ]);
  });

  it('should disassemble a constructor frame', () => {
    const result = disassembleStack(
      '    at new Repository (/app/repository.js:2:24)',
    );

    expect(result).toEqual([
      {
        type: 'location',
        entry: 'new Repository',
        location: '/app/repository.js',
        line: 2,
        column: 24,
      },
    ]);
  });

  it('should disassemble a method frame', () => {
    const result = disassembleStack(
      '    at Repository.load (/app/repository.js:3:18)',
    );

    expect(result).toEqual([
      {
        type: 'location',
        entry: 'Repository.load',
        location: '/app/repository.js',
        line: 3,
        column: 18,
      },
    ]);
  });

  it('should disassemble a frame of an anonymous function called as a method', () => {
    const result = disassembleStack(
      '    at Object.<anonymous> (/app/index.js:6:31)',
    );

    expect(result).toEqual([
      {
        type: 'location',
        entry: 'Object.<anonymous>',
        location: '/app/index.js',
        line: 6,
        column: 31,
      },
    ]);
  });

  it('should disassemble a frame with a method alias', () => {
    const result = disassembleStack(
      '    at Service.fetch [as get] (/app/service.js:4:5)',
    );

    expect(result).toEqual([
      {
        type: 'location',
        entry: 'Service.fetch [as get]',
        location: '/app/service.js',
        line: 4,
        column: 5,
      },
    ]);
  });

  it('should disassemble an eval frame at the source of its outermost eval call', () => {
    const result = disassembleStack(
      '    at eval (eval at <anonymous> (file:///app/index.js:12:7), <anonymous>:1:16)\n' +
        '    at eval (eval at run (eval at <anonymous> (file:///app/index.js:13:7), <anonymous>:1:1), <anonymous>:2:3)',
    );

    expect(result).toEqual([
      {
        type: 'location',
        entry: 'eval',
        location: 'file:///app/index.js',
        line: 12,
        column: 7,
      },
      {
        type: 'location',
        entry: 'eval',
        location: 'file:///app/index.js',
        line: 13,
        column: 7,
      },
    ]);
  });

  it('should skip frames without a source position while keeping the rest', () => {
    const result = disassembleStack(
      'Error: boom\n' +
        '    at Array.map (<anonymous>)\n' +
        '    at new Promise (<anonymous>)\n' +
        '    at async Promise.all (index 0)\n' +
        '    at Generator.next (native)\n' +
        '    at async main (file:///app/index.js:9:3)',
    );

    expect(result).toEqual([
      { type: 'description', name: 'Error', message: 'boom' },
      {
        type: 'location',
        entry: 'async main',
        location: 'file:///app/index.js',
        line: 9,
        column: 3,
      },
    ]);
  });

  it('should disassemble a frame with a windows path containing parentheses', () => {
    const result = disassembleStack(
      '    at new Repository (C:\\Program Files (x86)\\app\\repository.js:2:24)',
    );

    expect(result).toEqual([
      {
        type: 'location',
        entry: 'new Repository',
        location: 'C:\\Program Files (x86)\\app\\repository.js',
        line: 2,
        column: 24,
      },
    ]);
  });

  it('should disassemble firefox and safari frames', () => {
    const result = disassembleStack(
      'Repository.prototype.load@https://app.test/repository.js:3:18\n' +
        'async*main@https://app.test/index.js:9:3\n' +
        '@https://app.test/index.js:11:7\n' +
        'forEach@[native code]\n' +
        'global code@https://app.test/index.js:12:1',
    );

    expect(result).toEqual([
      {
        type: 'location',
        entry: 'Repository.prototype.load',
        location: 'https://app.test/repository.js',
        line: 3,
        column: 18,
      },
      {
        type: 'location',
        entry: 'async*main',
        location: 'https://app.test/index.js',
        line: 9,
        column: 3,
      },
      {
        type: 'location',
        entry: '',
        location: 'https://app.test/index.js',
        line: 11,
        column: 7,
      },
      {
        type: 'location',
        entry: 'global code',
        location: 'https://app.test/index.js',
        line: 12,
        column: 1,
      },
    ]);
  });
});
