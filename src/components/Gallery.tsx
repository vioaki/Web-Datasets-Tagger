import { useLayoutEffect, useRef, useState } from 'react'
import { defaultRangeExtractor, useWindowVirtualizer } from '@tanstack/react-virtual'
import { ResultCard } from './ResultCard'
import type { EngineId, Settings, TagResult } from '../lib/types'
import { useApp } from '../store/useApp'

interface Props { results: TagResult[]; indices: Map<string, number>; engine: EngineId; settings: Settings }

/** Independent measured columns retain the masonry rhythm while bounding DOM size. */
export function Gallery(props: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(1)
  useLayoutEffect(() => {
    const element = ref.current!
    const update = () => setColumns(Number(getComputedStyle(element).getPropertyValue('--gallery-columns')) || 1)
    const observer = new ResizeObserver(update)
    observer.observe(element); update()
    return () => observer.disconnect()
  }, [])
  return <div className="gallery gallery--virtual" ref={ref}>
    {Array.from({ length: columns }, (_, column) => <Column key={`${columns}-${column}`} {...props}
      results={props.results.filter((_, index) => index % columns === column)} />)}
  </div>
}

function Column({ results, indices, engine, settings }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [geometry, setGeometry] = useState({ top: 0, width: 320 })
  const [focused, setFocused] = useState<string | null>(null)
  const updateCaption = useApp((s) => s.updateCaption)
  const updateTags = useApp((s) => s.updateTags)
  const removeTag = useApp((s) => s.removeTag)
  const addTag = useApp((s) => s.addTag)
  useLayoutEffect(() => {
    const update = () => {
      const box = ref.current!.getBoundingClientRect()
      const top = box.top + window.scrollY
      setGeometry((old) => old.top === top && old.width === box.width ? old : { top, width: box.width })
    }
    const observer = new ResizeObserver(update)
    observer.observe(ref.current!); observer.observe(document.querySelector('main')!)
    update(); window.addEventListener('resize', update)
    return () => { observer.disconnect(); window.removeEventListener('resize', update) }
  }, [])
  const virtual = useWindowVirtualizer({
    count: results.length,
    getItemKey: (index) => results[index].id,
    estimateSize: (index) => geometry.width * ((results[index].h || 3) / (results[index].w || 4)) + 150,
    scrollMargin: geometry.top,
    overscan: 3,
    rangeExtractor: (range) => {
      const indexes = defaultRangeExtractor(range)
      const active = results.findIndex((r) => r.id === focused)
      return active < 0 ? indexes : [...new Set([...indexes, active])].sort((a, b) => a - b)
    },
  })
  return <div ref={ref} className="gallery__column" style={{ height: virtual.getTotalSize() }}>
    {virtual.getVirtualItems().map((item) => {
      const result = results[item.index]
      return <div key={item.key} data-index={item.index} ref={virtual.measureElement} className="gallery__item"
        style={{ transform: `translateY(${item.start - geometry.top}px)` }}
        onFocusCapture={() => setFocused(result.id)}
        onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(null) }}>
        <ResultCard result={result} index={indices.get(result.id)!} engine={engine} settings={settings}
          onRemoveTag={(name) => removeTag(result.id, name)} onAddTag={(name) => addTag(result.id, name)}
          onClearTags={() => updateTags(result.id, [])} onCaptionChange={(caption) => updateCaption(result.id, caption)} />
      </div>
    })}
  </div>
}
