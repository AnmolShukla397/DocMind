import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/bodoni-moda'
import '@fontsource-variable/jost'
import App from './App'
import './styles.css'
import './reframe.css'
import './experience.css'
import './site-finish.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><MotionConfig reducedMotion="user"><BrowserRouter><App /></BrowserRouter></MotionConfig></React.StrictMode>
)
