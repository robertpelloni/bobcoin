package main

import (
	"hash/fnv"
)

type BloomFilter struct {
	Bits      []uint64 `json:"bits"`
	Size      uint32   `json:"size"`
	HashCount int      `json:"hashCount"`
}

func NewBloomFilter(size uint32, hashCount int) *BloomFilter {
	return &BloomFilter{
		Bits:      make([]uint64, (size+63)/64),
		Size:      size,
		HashCount: hashCount,
	}
}

func (bf *BloomFilter) Add(data []byte) {
	for i := 0; i < bf.HashCount; i++ {
		idx := bf.hash(data, i) % bf.Size
		bf.Bits[idx/64] |= (1 << (idx % 64))
	}
}

func (bf *BloomFilter) Test(data []byte) bool {
	for i := 0; i < bf.HashCount; i++ {
		idx := bf.hash(data, i) % bf.Size
		if (bf.Bits[idx/64] & (1 << (idx % 64))) == 0 {
			return false
		}
	}
	return true
}

func (bf *BloomFilter) hash(data []byte, seed int) uint32 {
	h := fnv.New32a()
	h.Write(data)
	h.Write([]byte{byte(seed)})
	return h.Sum32()
}
