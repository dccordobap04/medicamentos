const apiUrlRegister = 'http://localhost:3000/usuarios'; // URL para registrar usuarios

document.getElementById('registerForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const nombreCompleto = document.getElementById('nombreCompleto').value;
    const correo = document.getElementById('correo').value;
    const identificacion = document.getElementById('identificacion').value;
    const contrasena = document.getElementById('contrasena').value;
    const confirmarContrasena = document.getElementById('confirmarContrasena').value;

    // Validación de que las contraseñas coinciden
    if (contrasena !== confirmarContrasena) {
        alert("Las contraseñas no coinciden.");
        return;
    }

    // Verificación de que los campos no estén vacíos
    if (!nombreCompleto || !correo || !identificacion || !contrasena) {
        alert('Por favor, complete todos los campos.');
        return;
    }

    try {
        const response = await fetch(apiUrlRegister, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nombreCompleto, correo, identificacion, contrasena })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                // Si el registro es exitoso, redirige al login
                alert('Registro exitoso. Inicia sesión.');
                window.location.href = 'index.html';
            } else {
                // Si el registro falla, muestra el error
                alert('Hubo un error al registrar el usuario.');
            }
        } else {
            alert('Hubo un error en el registro. Por favor, intente de nuevo más tarde.');
        }
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        alert('Hubo un error al procesar su solicitud.');
    }
});