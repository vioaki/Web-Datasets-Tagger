"""Generate a tiny ONNX model for real browser runtime smoke tests, without downloads.
It averages each input BGR channel and divides by 255. Not a trained tagger.
"""
from pathlib import Path
import struct, zlib

def varint(n):
    out = bytearray()
    while n > 127:
        out.append((n & 127) | 128); n >>= 7
    return bytes(out) + bytes([n])
def integer(field, value): return varint(field << 3) + varint(value)
def data(field, value):
    value = value.encode() if isinstance(value, str) else value
    return varint((field << 3) | 2) + varint(len(value)) + value
def shape(dims): return b''.join(data(1, integer(1, d) if isinstance(d, int) else data(2, d)) for d in dims)
def info(name, dims): return data(1, name) + data(2, data(1, integer(1, 1) + data(2, shape(dims))))
def attr(name, values): return data(1, name) + b''.join(integer(8, v) for v in values) + integer(20, 7)
def node(op, inputs, outputs, attributes=b''): return b''.join(data(1, s) for s in inputs) + b''.join(data(2, s) for s in outputs) + data(4, op) + attributes
mean = node('ReduceMean', ['image'], ['mean'], data(5, attr('axes', [1,2])) + data(5, data(1,'keepdims')+integer(3,0)+integer(20,2)))
div = node('Div', ['mean','scale'], ['scores'])
scale = integer(1,1)+integer(2,1)+data(8,'scale')+data(9,struct.pack('<f',255))
graph = data(1,mean)+data(1,div)+data(2,'channel_mean')+data(5,scale)+data(11,info('image',[1,'height','width',3]))+data(12,info('scores',[1,3]))
model = integer(1,8)+data(2,'tagger-smoke-test')+data(7,graph)+data(8,integer(2,13))
root=Path(__file__).parent
(root/'channel-mean.onnx').write_bytes(model)
(root/'channel-tags.csv').write_text('name,category\nblue,0\ngreen,0\nred,0\n')
def png(name,width,height,rgb):
    def chunk(kind,payload): return struct.pack('>I',len(payload))+kind+payload+struct.pack('>I',zlib.crc32(kind+payload)&0xffffffff)
    raw=b''.join(b'\x00'+bytes(rgb)*width for _ in range(height))
    (root/name).write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b''))
png('blue.png',240,320,(0,0,255)); png('red.png',360,240,(255,0,0))
(root/'broken.png').write_text('This is not an image.')
