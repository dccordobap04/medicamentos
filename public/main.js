const apiUrlLogin = 'http://localhost:3000/login'; // URL para autenticación de usuario
const apiUrlMedicamentos = 'http://localhost:3000/medicamentos'; // URL para obtener medicamentos
const apiUrlCalificaciones = 'http://localhost:3000/calificaciones'; // URL para enviar calificación

document.addEventListener('DOMContentLoaded', () => {
    // Verifica si el usuario ya está autenticado
    if (sessionStorage.getItem('isAuthenticated') === 'true') {
        // Si ya está autenticado, lo redirige al dashboard
        window.location.href = 'dashboard.html';
    } else {
        // Si no está autenticado, lo mantiene en la página de login
        document.getElementById('loginForm').addEventListener('submit', event => {
            event.preventDefault();
            loginUsuario(); // Llama a la función para manejar el inicio de sesión
        });
    }
});

// Función para manejar el inicio de sesión del usuario
async function loginUsuario() {
    const identificacion = document.getElementById('identificacion').value;
    const contrasena = document.getElementById('contrasena').value;

    // Se verifica que los campos no estén vacíos
    if (!identificacion || !contrasena) {
        mostrarError('Por favor, complete todos los campos.');
        return;
    }

    // Validación adicional (ejemplo: longitud mínima para contraseña)
    if (contrasena.length < 6) {
        mostrarError('La contraseña debe tener al menos 6 caracteres.');
        return;
    }

    try {
        // Realizamos la petición POST para autenticar al usuario
        const response = await fetch(apiUrlLogin, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ identificacion, contrasena })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                // Guardar en sessionStorage para recordar la autenticación
                sessionStorage.setItem('isAuthenticated', 'true');
                // Redirigir al dashboard si el inicio de sesión es exitoso
                window.location.href = 'dashboard.html';
            } else {
                // Mostrar un mensaje de error si las credenciales son incorrectas
                mostrarError('Identificación o contraseña incorrecta.');
            }
        } else {
            mostrarError('Hubo un error en la autenticación. Por favor, intente de nuevo más tarde.');
        }
    } catch (error) {
        console.error('Error al autenticar usuario:', error);
        mostrarError('Hubo un error al procesar su solicitud.');
    }
}

// Función para mostrar mensajes de error
function mostrarError(mensaje) {
    // Aquí puedes mostrar el error dentro de un contenedor en el HTML
    const errorDiv = document.createElement('div');
    errorDiv.classList.add('alert', 'alert-danger');
    errorDiv.textContent = mensaje;

    // Insertar el mensaje de error debajo del formulario
    const formulario = document.getElementById('loginForm');
    formulario.insertBefore(errorDiv, formulario.firstChild);

    // Eliminar el mensaje de error después de 5 segundos
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}


// Función para obtener medicamentos desde la API
async function obtenerMedicamentos() {
    try {
        const response = await fetch(apiUrlMedicamentos);
        if (response.ok) {
            const medicamentos = await response.json();
            mostrarMedicamentos(medicamentos);
        } else {
            console.error('Error al obtener medicamentos.');
        }
    } catch (error) {
        console.error('Error de red:', error);
    }
}

// Función para renderizar medicamentos en el HTML
function mostrarMedicamentos(medicamentos) {
    const listaProductos = document.getElementById('listaProductos');
    listaProductos.innerHTML = ''; // Limpiar contenido actual

    medicamentos.forEach(medicamento => {
        const productoHTML = `
            <div class="col-md-3 product-card">
                <div class="card">
                    <img src="${medicamento.imagen}" class="card-img-top" alt="${medicamento.nombre}">
                    <div class="card-body">
                        <h5 class="card-title">${medicamento.nombre}</h5>
                        <button class="btn btn-primary" onclick="calificarMedicamento('${medicamento.nombre}', ${medicamento.id})">Calificar</button>
                    </div>
                </div>
            </div>`;
        listaProductos.insertAdjacentHTML('beforeend', productoHTML);
    });
}

// Función para redirigir al formulario de calificación con parámetros de URL
function calificarMedicamento(nombre, id) {
    window.location.href = `calificacion.html?medicamento=${encodeURIComponent(nombre)}&id=${id}`;
}

// Función para enviar calificación a la API
async function enviarCalificacion() {
    const medicamentoId = new URLSearchParams(window.location.search).get('id');
    const fechaCalificacion = document.getElementById('fechaCalificacion').value;
    const efectividad = document.getElementById('efectividad').value;
    const frecuenciaIngesta = document.getElementById('frecuenciaIngesta').value;
    const disponibilidad = document.getElementById('disponibilidad').value;
    const satisfaccion = document.getElementById('satisfaccion').value;
    const efectosSecundarios = document.getElementById('efectosSecundarios').value;
    const observaciones = document.getElementById('observaciones').value;

    if (!medicamentoId || !fechaCalificacion || !efectividad || !frecuenciaIngesta || !disponibilidad || !satisfaccion) {
        mostrarError('Por favor, complete todos los campos obligatorios.');
        return;
    }

    try {
        const response = await fetch(apiUrlCalificaciones, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                medicamentoId,
                fechaCalificacion,
                efectividad,
                frecuenciaIngesta,
                disponibilidad,
                satisfaccion,
                efectosSecundarios,
                observaciones
            })
        });

        if (response.ok) {
            alert('Calificación enviada con éxito');
            window.location.href = 'dashboard.html';
        } else {
            mostrarError('Error al enviar la calificación.');
        }
    } catch (error) {
        console.error('Error al enviar calificación:', error);
        mostrarError('Hubo un error al procesar su solicitud.');
    }
}