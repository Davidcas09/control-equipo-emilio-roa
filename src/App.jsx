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
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [usuarioActual, setUsuarioActual] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoUsuario, setNuevoUsuario] = useState('')
  const [nuevoPassword, setNuevoPassword] = useState('')
  const [nuevoRol, setNuevoRol] = useState('operador')
  const [nuevoLocalId, setNuevoLocalId] = useState('')
  const [logueado, setLogueado] = useState(() => {
  return localStorage.getItem('logueado') === 'true'
})

  useEffect(() => {
    cargarLocales()
    cargarVotantes()
    cargarUsuarios()
  }, [])
useEffect(() => {
  const usuarioGuardado = localStorage.getItem('usuarioActual')

  if (usuarioGuardado) {
    setUsuarioActual(JSON.parse(usuarioGuardado))
  }
}, [])
  async function cargarLocales() {
    const { data } = await supabase.from('locales').select('*').order('id')
    setLocales(data || [])
  }

  async function cargarVotantes() {
    const { data } = await supabase
      .from('votantes')
      .select('id, cedula, nombre_completo, fecha_hora, registrado_por, locales(nombre)')
      .order('id', { ascending: false })

    setVotantes(data || [])
  }
async function cargarUsuarios() {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nombre, usuario, rol, local_id, locales(nombre)')
    .order('id')

  if (!error) {
    setUsuarios(data)
  }
}
  async function iniciarSesion(e) {
    e.preventDefault()

    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('usuario', usuario)
      .eq('password', password)
      .single()

    if (error || !data) {
      alert('Usuario o contraseña incorrectos')
      return
    }

    setUsuarioActual(data)
    localStorage.setItem('usuarioActual', JSON.stringify(data))
if (data.local_id) {
  setLocalId(String(data.local_id))
}
    setLogueado(true)
    localStorage.setItem('logueado', 'true')
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
    registrado_por: usuarioActual?.usuario,
  }
])

    if (error) {
      setMensaje('❌ Error al guardar: ' + error.message)
      return
    }

    setMensaje('✅ Registro guardado correctamente')
  const { error: errorAuditoria } = await supabase.from('auditoria').insert([
  {
    usuario: usuarioActual?.usuario,
    accion: `Registró votante ${nombre} (${cedula})`,
  },
])

if (errorAuditoria) {
  console.error('Error auditoria:', errorAuditoria)
}
    setCedula('')
    setNombre('')
    setLocalId('')
    cargarVotantes()
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

  await supabase.from('auditoria').insert([
    {
      usuario: usuarioActual?.usuario,
      accion: `Eliminó votante ID ${id}`,
    },
  ])

  cargarVotantes()
}

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

  const votantesFiltrados = votantes.filter((v) =>
    `${v.cedula} ${v.nombre_completo}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  )

  if (!logueado) {
    return (
      <div className="container">
        <div className="card">
          <h1>Control Equipo Emilio Roa</h1>
          <h2>Iniciar Sesión</h2>

          <form onSubmit={iniciarSesion}>
            <input
              type="text"
              placeholder="Usuario"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit">Ingresar</button>
          </form>
        </div>
      </div>
    )
  }
async function crearUsuario(e) {
  e.preventDefault()

  const { error } = await supabase.from('usuarios').insert([
    {
      nombre: nuevoNombre,
      usuario: nuevoUsuario,
      password: nuevoPassword,
      rol: nuevoRol,
      local_id: nuevoLocalId ? Number(nuevoLocalId) : null,
    },
  ])

  if (error) {
    alert('Error al crear usuario: ' + error.message)
    return
  }

  alert('Usuario creado correctamente')
  await supabase.from('auditoria').insert([
  {
    usuario: usuarioActual?.usuario,
    accion: `Creó usuario ${nuevoUsuario}`,
  },
])

  setNuevoNombre('')
  setNuevoUsuario('')
  setNuevoPassword('')
  setNuevoRol('operador')
  setNuevoLocalId('')

  cargarUsuarios()
}
  return (
    <main className="container">
      <h1>Control Equipo Emilio Roa</h1>
      <p className="subtitulo">Lista 2A · Opción 6</p>
{usuarioActual && (
  <p className="subtitulo">
    Usuario: {usuarioActual.usuario} · Rol: {usuarioActual.rol}

  </p>
)}
      <button
  onClick={() => {
    setLogueado(false)
    localStorage.removeItem('logueado')
    localStorage.removeItem('usuarioActual')
    setUsuarioActual(null)
  }}
>
  Cerrar sesión
</button>

      <form onSubmit={registrarVotante} className="card">
        <input
          placeholder="Cédula de identidad"
          value={cedula}
          onChange={(e) => setCedula(e.target.value)}
          required
        />

        <input
          placeholder="Nombre completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />

        <select
  value={localId}
  onChange={(e) => setLocalId(e.target.value)}
  required
  disabled={usuarioActual?.rol?.trim() === 'operador'}
>
  <option value="">Seleccionar local</option>
  {locales.map((local) => (
    <option key={local.id} value={local.id}>
      {local.nombre}
    </option>
  ))}
</select>

        <button type="submit">Registrar</button>
        {mensaje && <p className="mensaje">{mensaje}</p>}
      </form>

      <section className="card">
        <h2>Total registrados: {votantes.length}</h2>

       {usuarioActual && usuarioActual.rol?.trim() === 'administrador' && (
         <button onClick={exportarExcel}>
  📊 Exportar Excel
</button>
        )}

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
              <th>Registrado por</th>
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
                <td>{v.registrado_por}</td>
                <td>{new Date(v.fecha_hora).toLocaleString()}</td>
                <td>
                   {usuarioActual?.rol === 'administrador' ? (
                    <button onClick={() => eliminarVotante(v.id)}>
                    🗑️ Eliminar
                    </button>
                ) : null}
              </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {usuarioActual?.rol?.trim() === 'administrador' && (
  <section className="card">
    <h2>Usuarios del sistema</h2>
<form onSubmit={crearUsuario} className="card">
  <input
    placeholder="Nombre"
    value={nuevoNombre}
    onChange={(e) => setNuevoNombre(e.target.value)}
    required
  />

  <input
    placeholder="Usuario"
    value={nuevoUsuario}
    onChange={(e) => setNuevoUsuario(e.target.value)}
    required
  />

  <input
    placeholder="Contraseña"
    value={nuevoPassword}
    onChange={(e) => setNuevoPassword(e.target.value)}
    required
  />

  <select value={nuevoRol} onChange={(e) => setNuevoRol(e.target.value)}>
    <option value="operador">Operador</option>
    <option value="administrador">Administrador</option>
  </select>

  <select value={nuevoLocalId} onChange={(e) => setNuevoLocalId(e.target.value)}>
    <option value="">Sin local asignado</option>
    {locales.map((local) => (
      <option key={local.id} value={local.id}>
        {local.nombre}
      </option>
    ))}
  </select>

  <button type="submit">Crear usuario</button>
</form>
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Usuario</th>
          <th>Rol</th>
          <th>Local asignado</th>
        </tr>
      </thead>

      <tbody>
        {usuarios.map((u) => (
          <tr key={u.id}>
            <td>{u.nombre}</td>
            <td>{u.usuario}</td>
            <td>{u.rol}</td>
            <td>{u.locales?.nombre || 'Sin local'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
)}
    </main>
  )
}

export default App