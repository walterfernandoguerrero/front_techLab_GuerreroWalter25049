// Abre tu archivo login-form.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginMessage = document.getElementById('login-message');

    // Endpoint para obtener la lista de usuarios
    const USERS_ENDPOINT = 'http://localhost:8080/usuario/list';

    // Variable para almacenar todos los usuarios cargados desde el backend
    let allUsers = [];

    // Función para cargar los usuarios desde el backend
    const fetchUsers = async () => {
        try {
            const response = await fetch(USERS_ENDPOINT);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allUsers = await response.json(); // Almacenamos todos los usuarios

            if (allUsers.length === 0) {
                console.warn("No se encontraron usuarios en el backend. El login no funcionará.");
                loginMessage.textContent = 'No hay usuarios configurados para el login.';
                loginMessage.classList.add('error');
                loginMessage.style.display = 'block';
                loginForm.querySelector('button[type="submit"]').setAttribute('disabled', 'true'); // Deshabilitar botón
            } else {
                console.log("Usuarios cargados para autenticación:", allUsers.map(u => u.usuario));
                loginForm.querySelector('button[type="submit"]').removeAttribute('disabled'); // Habilitar botón
            }
        } catch (error) {
            console.error('Error al cargar usuarios del backend:', error);
            loginMessage.textContent = 'Error al conectar con el servidor para obtener usuarios.';
            loginMessage.classList.add('error');
            loginMessage.style.display = 'block';
            loginForm.querySelector('button[type="submit"]').setAttribute('disabled', 'true'); // Deshabilitar botón
        }
    };

    // Llama a la función para cargar los usuarios cuando se carga la página
    fetchUsers();

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Previene el envío del formulario por defecto

        const usernameInput = loginForm.username.value;
        const passwordInput = loginForm.password.value;

        loginMessage.style.display = 'none'; // Oculta mensajes anteriores

        if (allUsers.length === 0) {
            loginMessage.textContent = 'No hay usuarios disponibles para el login.';
            loginMessage.classList.add('error');
            loginMessage.style.display = 'block';
            return;
        }

        // Buscar al usuario en la lista cargada
        const foundUser = allUsers.find(user => 
            user.usuario === usernameInput && user.clave === passwordInput
        );

        if (foundUser) {
            // Login exitoso
            sessionStorage.setItem('loggedInUser', foundUser.usuario);

            // Asignar el rol basado en el campo 'rol' del usuario:
            // 1 para administrador, 2 para usuario normal (ajusta si tus valores son diferentes)
            const assignedRole = (foundUser.rol === 1) ? 'admin' : 'user';
            sessionStorage.setItem('userRole', assignedRole); 
            
            loginMessage.textContent = `¡Inicio de sesión exitoso como ${assignedRole}! Redirigiendo...`;
            loginMessage.classList.remove('error');
            loginMessage.classList.add('success');
            loginMessage.style.display = 'block';

            // Redirige al usuario después de un breve retraso
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            // Credenciales incorrectas
            loginMessage.textContent = 'Usuario o contraseña incorrectos.';
            loginMessage.classList.remove('success');
            loginMessage.classList.add('error');
            loginMessage.style.display = 'block';
        }
    });
});