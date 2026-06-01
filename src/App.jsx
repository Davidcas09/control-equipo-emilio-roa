import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './App.css'
import * as XLSX from 'xlsx'
function App() {
  const [locales, setLocales] = useState([])
  const [votantes, setVotantes] = useState([])
  const [cedula, setCedula] = useState('')
  const [nombre, setNombre] = useState('')
  const [localId, setLocalId] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargarLocales()
    cargarVotantes()
  }, [])

  async function cargarLocales() {
    const { data } = await supabase.from('locales').select('*').order('id')
    setLocales(data || [])
  }

  async function cargarVotantes() {
    const { data } = await supabase
      .from('votantes')
      .select('id, cedula, nombre_completo, fecha_hora, locales(nombre)')
      .order('id', { ascending: false })

    setVotantes(data || [])
  }

  async function registrarVotante(e) {
    e.preventDefault()
    setMensaje('')

    const { data: existente } = await supabase
      .from('votantes')
      .select('*')
      .eq('cedula', cedula)
      .maybeSingle()

    if (existente) {
      setMensaje('⚠️ Esta cédula ya fue registrada anteriormente')
      return
    }

    const { error } = await supabase.from('votantes').insert([
      {
        cedula,
        nombre_completo: nombre,
        local_id: Number(localId),
      },
    ])

    if (error) {
      setMensaje('❌ Error al guardar: ' + error.message)
      return
    }

    setMensaje('✅ Registro guardado correctamente')
    setCedula('')
    setNombre('')
    setLocalId('')
    cargarVotantes()
  }

  const votantesFiltrados = votantes.filter((v) =>
    `${v.cedula} ${v.nombre_completo}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  )
function exportarExcel() {
  const datos = votantes.map((v) => ({
    Cedula: v.cedula,
    Nombre: v.nombre_completo,
    Local: v.locales?.nombre,
    FechaHora: new Date(v.fecha_hora).toLocaleString(),
  }))

  const hoja = XLSX.utils.json_to_sheet(datos)
  const libro = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(libro, hoja, 'Votantes')

  XLSX.writeFile(libro, 'votantes.xlsx')
}
  function totalPorLocal(localNombre) {
    return votantes.filter((v) => v.locales?.nombre === localNombre).length
  }
async function eliminarVotante(id) {
  const confirmar = window.confirm('¿Seguro que quieres eliminar este registro?')

  if (!confirmar) return

  const { error } = await supabase
    .from('votantes')
    .delete()
    .eq('id', id)

  if (error) {
    alert('Error al eliminar: ' + error.message)
    return
  }

  cargarVotantes()
}
  return (
    <main className="container">
      <h1>Control Equipo Emilio Roa</h1>
      <p className="subtitulo">Lista 2A · Opción 6</p>

      <form onSubmit={registrarVotante} className="card">
        <input placeholder="Cédula de identidad" value={cedula} onChange={(e) => setCedula(e.target.value)} required />
        <input placeholder="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} required />

        <select value={localId} onChange={(e) => setLocalId(e.target.value)} required>
          <option value="">Seleccionar local</option>
          {locales.map((local) => (
            <option key={local.id} value={local.id}>{local.nombre}</option>
          ))}
        </select>

        <button type="submit">Registrar</button>
        {mensaje && <p className="mensaje">{mensaje}</p>}
      </form>

      <section className="card">
        <h2>Total registrados: {votantes.length}</h2>
<button onClick={exportarExcel}>
  📊 Exportar Excel
</button>
        <h3>Totales por local</h3>
        {locales.map((local) => (
          <p key={local.id}>
            {local.nombre}: <strong>{totalPorLocal(local.nombre)}</strong>
          </p>
        ))}
      </section>

      <section className="card">
        <input
          placeholder="Buscar por cédula o nombre"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <table>
          <thead>
            <tr>
              <th>Cédula</th>
              <th>Nombre</th>
              <th>Local</th>
              <th>Fecha/Hora</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {votantesFiltrados.map((v) => (
              <tr key={v.id}>
                <td>{v.cedula}</td>
                <td>{v.nombre_completo}</td>
                <td>{v.locales?.nombre}</td>
                <td>{new Date(v.fecha_hora).toLocaleString()}</td>
                <td>
  <button onClick={() => eliminarVotante(v.id)}>
    🗑️ Eliminar
  </button>
</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  )
}

export default App