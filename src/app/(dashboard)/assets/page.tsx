'use client'

import { Suspense } from 'react'
import { AssetsView } from './components/assets-view'

// Suspense because the view reads its tab from the URL: useSearchParams opts the
// subtree out of static prerendering and the build requires a boundary for it.
export default function AssetsPage() {
  return (
    <Suspense>
      <AssetsView />
    </Suspense>
  )
}
