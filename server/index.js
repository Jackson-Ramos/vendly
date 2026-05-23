import express from 'express'
import cors from 'cors'
import filtersRoute from './routes/filters.js'
import dashboardRoute from './routes/dashboard.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use('/api/filters', filtersRoute)
app.use('/api/dashboard', dashboardRoute)

app.get('/api/health', (_, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})
