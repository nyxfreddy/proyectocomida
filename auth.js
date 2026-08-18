const SESSION_KEY = "comida-sesion";
const USUARIOS = [
  { user: "freddy", pass: "76752716", write: true },
  { user: "jorge", pass: "40345782", write: true },
  { user: "invitado", pass: "invitado", write: true, localOnly: true },
];

const NOMBRES = {
  freddy: "Freddy",
  jorge: "Jorge",
  invitado: "Invitado",
};

function nombreVisible(user) {
  return NOMBRES[user] || "";
}

function esJorge() {
  const sesion = sesionActual();
  return Boolean(sesion && sesion.user === "jorge");
}

function esFreddy() {
  const sesion = sesionActual();
  return Boolean(sesion && sesion.user === "freddy");
}

function esInvitado() {
  const sesion = sesionActual();
  return Boolean(sesion && (sesion.localOnly || sesion.user === "invitado"));
}

function encontrarUsuario(user, pass) {
  const nombre = String(user || "").trim().toLowerCase();
  const clave = String(pass ?? "");
  if (!nombre || !clave) return null;
  return (
    USUARIOS.find((item) => item.user === nombre && item.pass === clave) || null
  );
}

function abrirSesion(cuenta) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user: cuenta.user, pass: cuenta.pass }));
}

function cerrarSesion() {
  sessionStorage.removeItem(SESSION_KEY);
}

function sesionActual() {
  try {
    const data = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    if (!data) return null;
    return encontrarUsuario(data.user, data.pass);
  } catch {
    return null;
  }
}
