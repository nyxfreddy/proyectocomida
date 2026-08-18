const login = document.querySelector("#login");
const form = document.querySelector("#clave-panel");
const usuario = document.querySelector("#usuario");
const clave = document.querySelector("#clave");
const verClave = document.querySelector("#ver-clave");
const loginError = document.querySelector("#login-error");
const headerEl = document.querySelector("header");

function pinHeaderHeight() {
  if (!headerEl) return;
  document.documentElement.style.setProperty("--header-h", `${headerEl.offsetHeight}px`);
}

pinHeaderHeight();
if (headerEl && typeof ResizeObserver !== "undefined") {
  new ResizeObserver(pinHeaderHeight).observe(headerEl);
}
headerEl?.addEventListener("wheel", (event) => {
  const scroller = document.querySelector(".app");
  if (!scroller || scroller.inert) return;
  scroller.scrollTop += event.deltaY;
}, { passive: true });

function puedeEnmascararTexto() {
  try {
    return CSS.supports("-webkit-text-security", "disc") || CSS.supports("text-security", "disc");
  } catch {
    return false;
  }
}

function aplicarTecladoClave() {
  const nombre = String(usuario.value || "").trim().toLowerCase();
  clave.setAttribute("inputmode", nombre === "invitado" ? "text" : "numeric");
  clave.removeAttribute("pattern");
}

function claveEstaVisible() {
  return verClave.getAttribute("aria-pressed") === "true";
}

function aplicarMascaraClave(oculta) {
  if (puedeEnmascararTexto()) {
    clave.type = "text";
    clave.classList.toggle("oculta", oculta);
  } else {
    clave.classList.remove("oculta");
    clave.type = oculta ? "password" : "text";
  }
  verClave.setAttribute("aria-pressed", String(!oculta));
  verClave.setAttribute("aria-label", oculta ? "Mostrar clave" : "Ocultar clave");
}

let claveValor = "";

function claveActual() {
  return String(clave.value || claveValor || "");
}

function soloMinusculas() {
  const start = usuario.selectionStart;
  const end = usuario.selectionEnd;
  usuario.value = usuario.value.toLowerCase();
  try {
    if (start != null && end != null) usuario.setSelectionRange(start, end);
  } catch {}
  aplicarTecladoClave();
}

function mostrarErrorLogin(texto) {
  loginError.textContent = texto;
  loginError.hidden = !texto;
  form.classList.toggle("error", Boolean(texto));
}

function limpiarErrorLogin() {
  mostrarErrorLogin("");
}

usuario.addEventListener("input", () => {
  soloMinusculas();
  limpiarErrorLogin();
});
usuario.addEventListener("blur", soloMinusculas);
clave.addEventListener("input", () => {
  claveValor = clave.value;
  limpiarErrorLogin();
});

function viewportVisible() {
  const vv = window.visualViewport;
  return {
    top: vv ? vv.offsetTop : 0,
    height: vv ? vv.height : window.innerHeight,
  };
}

function syncLoginViewport() {
  if (!login.open) return;
  const { top, height } = viewportVisible();
  const headerH = headerEl ? headerEl.offsetHeight : 140;
  const loginTop = top + Math.max(headerH - 18, 72);
  document.documentElement.style.setProperty("--vv-top", `${top}px`);
  document.documentElement.style.setProperty("--header-h", `${headerH}px`);
  document.documentElement.style.setProperty("--login-top", `${loginTop}px`);
  document.documentElement.style.setProperty("--login-max-h", `${Math.max(200, height - (loginTop - top) - 12)}px`);
}

function bloquearFondoLogin(event) {
  if (login.contains(event.target)) return;
  event.preventDefault();
}

let loginViewportAnclado = false;

function anclarLoginViewport() {
  if (!loginViewportAnclado) {
    window.visualViewport?.addEventListener("resize", syncLoginViewport);
    window.visualViewport?.addEventListener("scroll", syncLoginViewport);
    window.addEventListener("resize", syncLoginViewport);
    document.addEventListener("touchmove", bloquearFondoLogin, { passive: false });
    loginViewportAnclado = true;
  }
  document.documentElement.classList.add("login-abierto");
  document.body.classList.add("login-abierto");
  if (headerEl) document.documentElement.style.setProperty("--header-h", `${headerEl.offsetHeight}px`);
  syncLoginViewport();
}

function soltarLoginViewport() {
  if (loginViewportAnclado) {
    window.visualViewport?.removeEventListener("resize", syncLoginViewport);
    window.visualViewport?.removeEventListener("scroll", syncLoginViewport);
    window.removeEventListener("resize", syncLoginViewport);
    document.removeEventListener("touchmove", bloquearFondoLogin);
    loginViewportAnclado = false;
  }
  document.documentElement.classList.remove("login-abierto");
  document.body.classList.remove("login-abierto");
  document.documentElement.style.removeProperty("--vv-top");
  document.documentElement.style.removeProperty("--header-h");
  document.documentElement.style.removeProperty("--login-top");
  document.documentElement.style.removeProperty("--login-max-h");
}

function abrirLogin() {
  usuario.value = "";
  clave.value = "";
  claveValor = "";
  aplicarMascaraClave(true);
  aplicarTecladoClave();
  limpiarErrorLogin();
  if (!login.open) login.showModal();
  anclarLoginViewport();
  requestAnimationFrame(() => {
    syncLoginViewport();
    usuario.focus({ preventScroll: true });
    syncLoginViewport();
  });
}

function cerrarLogin() {
  soltarLoginViewport();
  if (login.open) login.close();
}

verClave.addEventListener("click", () => {
  aplicarMascaraClave(claveEstaVisible());
  clave.focus({ preventScroll: true });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const nombre = usuario.value.trim();
  const pass = claveActual();
  if (!nombre) {
    mostrarErrorLogin("Escribe tu usuario.");
    usuario.focus({ preventScroll: true });
    return;
  }
  if (!pass) {
    mostrarErrorLogin("Escribe tu clave.");
    clave.focus({ preventScroll: true });
    return;
  }
  const cuenta = encontrarUsuario(nombre, pass);
  if (!cuenta) {
    mostrarErrorLogin("Usuario o clave incorrectos.");
    aplicarMascaraClave(true);
    clave.value = "";
    clave.focus({ preventScroll: true });
    return;
  }
  abrirSesion(cuenta);
  cerrarLogin();
  window.dispatchEvent(new Event("comida-login"));
});

login.addEventListener("cancel", (event) => {
  if (!sesionActual()) event.preventDefault();
});

login.addEventListener("close", soltarLoginViewport);

login.addEventListener("focusin", () => {
  window.scrollTo(0, 0);
  document.querySelector(".app")?.scrollTo(0, 0);
  syncLoginViewport();
});

login.addEventListener("click", (event) => {
  const box = login.getBoundingClientRect();
  const inside =
    event.clientX >= box.left &&
    event.clientX <= box.right &&
    event.clientY >= box.top &&
    event.clientY <= box.bottom;
  if (!inside && sesionActual()) cerrarLogin();
});
