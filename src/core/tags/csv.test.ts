import { describe, expect, it } from 'vitest'
import { parseCSV, parseTagsCSV } from './csv'

describe('tag CSV parsing', () => {
  it('handles quoted commas, escaped quotes and CRLF', () => {
    const rows = parseCSV('\uFEFFtag_id,name,category\r\n1,"artist, one",1\r\n2,"say ""hello""",0\r\n')
    expect(rows).toEqual([['tag_id', 'name', 'category'], ['1', 'artist, one', '1'], ['2', 'say "hello"', '0']])
    expect(parseTagsCSV('tag_id,name,category\n1,"artist, one",1\n')).toEqual([{ name: 'artist, one', category: 1 }])
  })

  it('keeps the first row for headerless files', () => {
    expect(parseTagsCSV('blue sky,0\nred hair,4\n')).toEqual([
      { name: 'blue sky', category: 0 }, { name: 'red hair', category: 4 },
    ])
  })

  it('rejects unterminated quoted fields', () => {
    expect(() => parseCSV('name,category\n"broken,0')).toThrow('未闭合')
  })
})
