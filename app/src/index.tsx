// app/src/index.tsx — Entry point

import { render } from 'solid-js/web'
import App from './App'

const root = document.getElementById('app')!
// Remove skeleton before hydrating
root.innerHTML = ''
render(() => <App />, root)
