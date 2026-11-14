import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Subscribes to Supabase Realtime changes on `table` and calls `onChange`
 * whenever a row is inserted, updated, or deleted. Bursts of changes are
 * debounced into a single call.
 */
export function useRealtimeRefresh(table: string, onChange: () => void) {
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  useEffect(() => {
    const supabase = createClient()
    let debounceTimer: ReturnType<typeof setTimeout> | undefined

    const channel = supabase
      .channel(`realtime-refresh-${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          if (debounceTimer) clearTimeout(debounceTimer)
          debounceTimer = setTimeout(() => onChangeRef.current(), 400)
        }
      )
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      supabase.removeChannel(channel)
    }
  }, [table])
}
