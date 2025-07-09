document.addEventListener('DOMContentLoaded', () => {
    const productosListaDiv = document.getElementById('productos-lista');
    const errorMessageDiv = document.getElementById('error-message');
    const loginLogoutBtn = document.getElementById('login-logout-btn');
    const addBtnContainer = document.getElementById('add-btn-container');

    const endpointList = 'http://localhost:8080/producto/list';
    const endpointDelete = 'http://localhost:8080/producto/delete/';

    // --- Funciones de Utilidad ---
    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for(let i=0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    const formatPrice = (price) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0
        }).format(price);
    };

    // --- Lógica de Sesión ---
    let isLoggedIn = false; // Variable global para el estado de la sesión

    const checkLoginStatus = () => {
        // Verifica si hay un estado de login en sessionStorage
        const loggedInUser = sessionStorage.getItem('loggedInUser');
        if (loggedInUser) {
            isLoggedIn = true;
            loginLogoutBtn.textContent = 'Salir';
            addBtnContainer.style.display = 'block'; // Mostrar botón de agregar
        } else {
            isLoggedIn = false;
            loginLogoutBtn.textContent = 'Ingresar';
            addBtnContainer.style.display = 'none'; // Ocultar botón de agregar
        }
        // Después de verificar el estado, actualiza la visibilidad de los botones en las tarjetas
        updateProductCardButtonsVisibility();
    };

    const login = (username) => {
        sessionStorage.setItem('loggedInUser', username); // Guarda el usuario logueado
        checkLoginStatus(); // Actualiza UI
        alert(`¡Bienvenido, ${username}!`); // Mensaje de bienvenida
        window.location.href = 'index.html'; // Redirige a la página principal
    };

    const logout = () => {
        sessionStorage.removeItem('loggedInUser'); // Elimina el estado de login
        isLoggedIn = false; // Reinicia la variable
        checkLoginStatus(); // Actualiza UI
        alert('Has cerrado sesión.');
        window.location.href = 'index.html'; // Redirige a la página principal
    };

    // --- Manejo del botón Ingresar/Salir ---
    loginLogoutBtn.addEventListener('click', () => {
        if (isLoggedIn) {
            logout();
        } else {
            window.location.href = 'login-form.html'; // Redirige al formulario de login
        }
    });

    // --- Función para actualizar la visibilidad de los botones de las tarjetas ---
    const updateProductCardButtonsVisibility = () => {
        document.querySelectorAll('.producto-card .actions').forEach(actionsContainer => {
            if (isLoggedIn) {
                actionsContainer.classList.add('visible'); // Muestra los botones
            } else {
                actionsContainer.classList.remove('visible'); // Oculta los botones
            }
        });
    };

    // --- Funciones de Carga y Eliminación de Productos ---
    const fetchProducts = () => {
        productosListaDiv.innerHTML = '<p>Cargando productos...</p>';
        errorMessageDiv.style.display = 'none';

        fetch(endpointList)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(productos => {
                productosListaDiv.innerHTML = '';

                if (productos.length === 0) {
                    productosListaDiv.innerHTML = '<p>No hay productos disponibles en este momento.</p>';
                    return;
                }

                productos.forEach(producto => {
                    const productoCard = document.createElement('div');
                    productoCard.classList.add('producto-card');

                    productoCard.innerHTML = `
                        <h2>${producto.nombre}</h2>
                        <p><strong>ID:</strong> ${producto.id}</p>
                        <p><strong>Descripción:</strong> ${producto.descripcion}</p>
                        <p><strong>Categoría:</strong> ${producto.categoria}</p>
                        <p><strong>Stock:</strong> ${producto.stock}</p>
                        <p class="precio"><strong>Precio:</strong> ${formatPrice(producto.precio)}</p>
                        ${producto.url_imagen ? `<img src="${producto.url_imagen}" alt="${producto.nombre}" style="max-width: 100%; height: auto; border-radius: 4px; margin-top: 10px;">` : ''}
                        
                        <div class="actions">
                            <a href="product-form.html?id=${producto.id}" class="btn-secondary">Modificar</a>
                            <button class="btn-danger delete-btn" data-id="${producto.id}">Eliminar</button>
                        </div>
                    `;
                    productosListaDiv.appendChild(productoCard);
                });

                // Re-verificar la visibilidad de los botones de las tarjetas después de cargarlos
                updateProductCardButtonsVisibility();

                // Añadir event listeners para los botones de eliminar
                document.querySelectorAll('.delete-btn').forEach(button => {
                    // Solo añadir el listener si el botón está visible (o lo estará)
                    // Esto es para asegurarse de que no se pueda eliminar si no está logueado
                    if (isLoggedIn) {
                        button.addEventListener('click', (event) => {
                            const productId = event.target.dataset.id;
                            if (confirm(`¿Estás seguro de que quieres eliminar el producto con ID: ${productId}?`)) {
                                deleteProduct(productId);
                            }
                        });
                    } else {
                         // Si no está logueado, podríamos deshabilitar los botones explícitamente o solo su click
                         button.setAttribute('disabled', 'true');
                    }
                });
            })
            .catch(error => {
                console.error('Error al cargar los productos:', error);
                productosListaDiv.innerHTML = '';
                errorMessageDiv.style.display = 'block';
            });
    };

    const deleteProduct = (id) => {
        const csrfToken = getCookie('XSRF-TOKEN');

        fetch(endpointDelete + id, {
            method: 'DELETE',
            headers: {
                'X-XSRF-TOKEN': csrfToken
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().catch(() => ({ message: 'Error desconocido al eliminar el producto.' }))
                               .then(err => { throw new Error(err.message || 'Error en la respuesta del servidor.'); });
            }
            console.log(`Producto con ID ${id} eliminado correctamente.`);
            fetchProducts();
        })
        .catch(error => {
            console.error('Error al eliminar el producto:', error);
            alert(`No se pudo eliminar el producto: ${error.message}`);
        });
    };

    // --- Inicialización ---
    checkLoginStatus(); // Verifica el estado de login al cargar la página
    fetchProducts(); // Carga los productos
});