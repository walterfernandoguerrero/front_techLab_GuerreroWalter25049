document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginMessageDiv = document.getElementById('login-message');

    const usersEndpoint = 'http://localhost:8080/usuario/list';

    // --- Función para mostrar mensajes en el formulario ---
    const showLoginMessage = (message, type) => {
        loginMessageDiv.textContent = message;
        loginMessageDiv.className = `message ${type}`;
        loginMessageDiv.style.display = 'block';
        setTimeout(() => {
            loginMessageDiv.style.display = 'none';
        }, 3000); // Ocultar después de 3 segundos
    };

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Evitar el envío predeterminado del formulario

        const username = usernameInput.value;
        const password = passwordInput.value;

        // Fetch para obtener la lista de usuarios
        fetch(usersEndpoint)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error al cargar usuarios: ${response.status}`);
                }
                return response.json();
            })
            .then(users => {
                // Buscar si hay un usuario que coincida con las credenciales
                const foundUser = users.find(user => 
                    user.usuario === username && user.clave === password
                );

                if (foundUser) {
                    // Si se encuentra el usuario, "iniciar sesión"
                    sessionStorage.setItem('loggedInUser', foundUser.usuario);
                    showLoginMessage('Inicio de sesión exitoso. Redirigiendo...', 'success');
                    console.log('Usuario autenticado:', foundUser.usuario);
                    
                    // Retraso para que el usuario vea el mensaje de éxito
                    setTimeout(() => {
                        window.location.href = 'index.html'; // Redirigir a la página principal
                    }, 1000);

                } else {
                    showLoginMessage('Usuario o contraseña incorrectos.', 'error');
                    console.log('Intento de inicio de sesión fallido.');
                }
            })
            .catch(error => {
                console.error('Error durante la autenticación:', error);
                showLoginMessage(`Error de conexión: ${error.message}. Intente más tarde.`, 'error');
            });
    });
});