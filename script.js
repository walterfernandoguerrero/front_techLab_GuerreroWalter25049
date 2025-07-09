// script.js - Versión Final y Corregida

document.addEventListener('DOMContentLoaded', () => {
    // --- Variables Globales y Referencias al DOM ---
    const productosListaDiv = document.getElementById('productos-lista');
    const errorMessageDiv = document.getElementById('error-message');
    const loginLogoutBtn = document.getElementById('login-logout-btn');
    const addBtnContainer = document.getElementById('add-btn-container'); // Contenedor del botón 'Agregar Nuevo Producto'
    const toggleCartBtn = document.getElementById('toggle-cart-btn');
    const shoppingCartSidebar = document.getElementById('shopping-cart-sidebar');
    const cartItemsDiv = document.getElementById('cart-items');
    const cartItemCountSpan = document.getElementById('cart-item-count'); // Contador en el botón principal 'Carrito'
    const cartTotalPriceSpan = document.getElementById('cart-total-price'); // Precio total en la barra lateral
    const finalizePurchaseBtn = document.getElementById('finalize-purchase-btn');
    const clearCartBtn = document.getElementById('clear-cart-btn');

    // --- Endpoints del Backend ---
    const endpointList = 'http://localhost:8080/producto/list';
    const endpointDelete = 'http://localhost:8080/producto/delete/';
    const endpointBatchPedido = 'http://localhost:8080/pedido/batchPedidos'; // Endpoint para pedidos en batch

    // --- Variables del Carrito de Compras ---
    // Carga el carrito desde localStorage o inicializa como un array vacío si no existe.
    let cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
    // Para asegurar que todos los ítems de un mismo pedido tengan el mismo número de pedido global.
    let nroPedidoGlobal = null;

    // --- Variables de Sesión y Autenticación ---
    let isLoggedIn = false;
    let loggedInUsername = null; // Almacena el nombre de usuario logueado.
    let userRole = null; // Almacenará el rol del usuario ('admin' o 'user').

    // --- Funciones de Utilidad ---

    /**
     * Obtiene el valor de una cookie por su nombre.
     * Es útil para obtener tokens CSRF (`XSRF-TOKEN`) en entornos Spring Security.
     * @param {string} name El nombre de la cookie.
     * @returns {string|null} El valor de la cookie, o `null` si no se encuentra.
     */
    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    /**
     * Formatea un número como una cadena de moneda para Pesos Argentinos (ARS).
     * @param {number} price El precio a formatear.
     * @returns {string} La cadena de texto con el precio formateado (ej. "$ 1.234").
     */
    const formatPrice = (price) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0
        }).format(price);
    };

    /**
     * Devuelve la fecha actual en formato DD/MM/YYYY.
     * @returns {string} La fecha actual formateada como una cadena de texto.
     */
    const getCurrentDate = () => {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0'); // Enero es 0!
        const yyyy = today.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    };

    // --- Lógica de Sesión y Actualización de Interfaz de Usuario ---

    /**
     * Verifica el estado de inicio de sesión del usuario almacenado en `sessionStorage`.
     * Actualiza las variables globales `isLoggedIn`, `loggedInUsername` y `userRole`.
     * Luego, llama a `updateProductCardButtonsVisibility()` para ajustar la UI.
     */
    const checkLoginStatus = () => {
        loggedInUsername = sessionStorage.getItem('loggedInUser');
        userRole = sessionStorage.getItem('userRole'); // Obtener el rol del usuario

        isLoggedIn = loggedInUsername !== null;

        if (isLoggedIn) {
            loginLogoutBtn.textContent = 'ADMIN Close';
            loginLogoutBtn.classList.remove('btn-primary');
            loginLogoutBtn.classList.add('btn-secondary');
        } else {
            loginLogoutBtn.textContent = 'LOGUIN ADMIN';
            loginLogoutBtn.classList.remove('btn-secondary');
            loginLogoutBtn.classList.add('btn-primary');
        }
        // No llamamos a updateProductCardButtonsVisibility aquí directamente
        // porque fetchProducts lo llamará después de crear las tarjetas.
    };

    /**
     * Cierra la sesión del usuario.
     * Elimina los datos de sesión de `sessionStorage` y redirige a la página principal.
     */
    const logout = () => {
        sessionStorage.removeItem('loggedInUser');
        sessionStorage.removeItem('userRole'); // También limpiar el rol
        isLoggedIn = false;
        loggedInUsername = null;
        userRole = null;
        alert('Has cerrado sesión.');
        window.location.href = 'index.html'; // Redirige a la página principal después del logout
    };

    // Event Listener para el botón principal de 'Ingresar' / 'Salir'
    loginLogoutBtn.addEventListener('click', () => {
        if (isLoggedIn) {
            logout();
        } else {
            window.location.href = 'login-form.html'; // Redirige al formulario de login
        }
    });

    /**
     * Actualiza la visibilidad de varios elementos de la interfaz de usuario:
     * - El botón "Agregar Nuevo Producto" (solo para administradores logueados).
     * - Los botones de "Modificar" y "Eliminar" en las tarjetas de producto (solo para administradores logueados).
     * - Los controles de compra (cantidad y botón "Comprar") en las tarjetas de producto (solo para usuarios logueados).
     * - Los botones "Finalizar Compra" y "Vaciar Carrito" en el sidebar del carrito.
     * Esta función debe llamarse cada vez que cambie el estado de login o se carguen/recarguen productos.
     */
    const updateProductCardButtonsVisibility = () => {
        // Mostrar/ocultar el contenedor del botón "Agregar Nuevo Producto"
        if (addBtnContainer) {
            addBtnContainer.style.display = (isLoggedIn && userRole === 'admin') ? 'block' : 'none';
        }

        // Seleccionar todas las tarjetas de producto y sus controles
        document.querySelectorAll('.producto-card').forEach(card => {
            const actionsContainer = card.querySelector('.actions');
            const buyControlsContainer = card.querySelector('.buy-controls');

            if (actionsContainer) {
                // Si es admin, mostramos los botones de modificar/eliminar
                if (isLoggedIn && userRole === 'admin') {
                    actionsContainer.classList.add('visible'); // Añade la clase 'visible'
                } else {
                    actionsContainer.classList.remove('visible'); // Quita la clase 'visible'
                }
            }

            if (buyControlsContainer) {
                // Si es usuario, mostramos los controles de compra
                if (isLoggedIn && userRole === 'user') {
                    buyControlsContainer.classList.add('visible'); // Añade la clase 'visible'
                } else {
                    buyControlsContainer.classList.remove('visible'); // Quita la clase 'visible'
                }
            }
        });


        // Mostrar/ocultar los botones del carrito ('Finalizar Compra', 'Vaciar Carrito')
        if (finalizePurchaseBtn && clearCartBtn) {
            if (isLoggedIn && userRole === 'user' && cart.length > 0) {
                finalizePurchaseBtn.style.display = 'block';
                clearCartBtn.style.display = 'block';
            } else {
                finalizePurchaseBtn.style.display = 'none';
                clearCartBtn.style.display = 'none';
            }
        }
    };

    // --- Lógica del Carrito de Compras ---

    /**
     * Genera un número de pedido único (`nropedido`) si no hay uno ya asignado a la sesión actual.
     * Esto asegura que todos los ítems de un mismo carrito formen parte del mismo pedido.
     * @returns {number} El número de pedido generado o existente.
     */
    const generateNroPedido = () => {
        if (!nroPedidoGlobal) {
            // Usa un timestamp más un número aleatorio para mayor unicidad
            nroPedidoGlobal = Date.now() + Math.floor(Math.random() * 1000);
            console.log("Generado nuevo NroPedido:", nroPedidoGlobal);
        }
        return nroPedidoGlobal;
    };

    /**
     * Renderiza los ítems actuales del carrito en la barra lateral.
     * Calcula el total y actualiza los contadores.
     * Guarda el estado del carrito en `localStorage`.
     */
    const renderCart = () => {
        cartItemsDiv.innerHTML = ''; // Limpia el contenedor del carrito
        let total = 0;

        if (cart.length === 0) {
            cartItemsDiv.innerHTML = '<p>El carrito está vacío.</p>';
        } else {
            cart.forEach((item, index) => {
                const itemTotal = item.precio * item.cantidad;
                total += itemTotal;

                const cartItemCard = document.createElement('div');
                cartItemCard.classList.add('cart-item-card');
                cartItemCard.innerHTML = `
                    <div class="cart-item-info">
                        <p><strong>${item.nombreProducto}</strong></p>
                        <p>Cant: ${item.cantidad} x ${formatPrice(item.precio)} = ${formatPrice(itemTotal)}</p>
                    </div>
                    <button class="cart-item-remove btn-danger" data-index="${index}">X</button>
                `;
                cartItemsDiv.appendChild(cartItemCard);
            });
        }

        // Actualiza el contador de ítems en el botón principal del carrito y el precio total
        cartItemCountSpan.textContent = cart.length;
        cartTotalPriceSpan.textContent = formatPrice(total);

        // Actualiza la visibilidad de los botones de finalizar compra/vaciar carrito
        updateProductCardButtonsVisibility(); // Se llama aquí también para reevaluar al cambiar el carrito

        // Guarda el estado actual del carrito en localStorage
        localStorage.setItem('shoppingCart', JSON.stringify(cart));

        // Adjunta event listeners a los botones 'X' de eliminar ítem en el carrito
        document.querySelectorAll('.cart-item-remove').forEach(button => {
            button.addEventListener('click', (event) => {
                const indexToRemove = parseInt(event.target.dataset.index);
                removeItemFromCart(indexToRemove);
            });
        });
    };

    /**
     * Añade un producto al carrito o actualiza su cantidad si ya está presente.
     * Realiza validaciones de cantidad y rol de usuario.
     * @param {object} product El objeto producto a añadir (debe contener `id`, `nombre`, `precio`).
     */
    const addItemToCart = (product) => {
        // Solo permite añadir al carrito si el usuario está logueado y tiene rol 'user'
        if (!isLoggedIn || userRole !== 'user') {
            alert('Debes iniciar sesión como usuario para agregar productos al carrito.');
            return;
        }

        const quantityInput = document.getElementById(`quantity-${product.id}`);
        if (!quantityInput) {
            console.error(`Input de cantidad para producto ${product.id} no encontrado.`);
            alert('Error: No se pudo obtener la cantidad del producto.');
            return;
        }
        const quantity = parseInt(quantityInput.value);

        if (isNaN(quantity) || quantity <= 0) {
            alert('Por favor, ingresa una cantidad válida y mayor a 0.');
            return;
        }

        // Busca si el producto ya existe en el carrito
        const existingItemIndex = cart.findIndex(item => item.id === product.id);

        if (existingItemIndex > -1) {
            // Si ya existe, actualiza la cantidad
            cart[existingItemIndex].cantidad += quantity;
            alert(`Cantidad de "${product.nombre}" actualizada en el carrito.`);
        } else {
            // Si no existe, lo añade como un nuevo ítem al carrito
            cart.push({
                id: product.id,
                nombreProducto: product.nombre, // Nombre para mostrar en el carrito
                precio: product.precio,
                cantidad: quantity
            });
            alert(`"${product.nombre}" añadido al carrito.`);
        }

        renderCart(); // Vuelve a renderizar el carrito para reflejar los cambios
    };

    /**
     * Elimina un producto del carrito por su índice en el array.
     * @param {number} index El índice del producto a eliminar en el array `cart`.
     */
    const removeItemFromCart = (index) => {
        // Solo permite eliminar del carrito si el usuario está logueado y tiene rol 'user'
        if (!isLoggedIn || userRole !== 'user') {
            alert('Debes iniciar sesión como usuario para modificar el carrito.');
            return;
        }
        cart.splice(index, 1); // Elimina el ítem del array
        renderCart(); // Vuelve a renderizar el carrito
        alert('Producto eliminado del carrito.');
    };

    /**
     * Vacía completamente el carrito de compras.
     */
    const clearCart = () => {
        // Solo permite vaciar el carrito si el usuario está logueado y tiene rol 'user'
        if (!isLoggedIn || userRole !== 'user') {
            alert('Debes iniciar sesión como usuario para vaciar el carrito.');
            return;
        }
        cart = []; // Vacía el array del carrito
        nroPedidoGlobal = null; // Reinicia el número de pedido global
        renderCart(); // Vuelve a renderizar el carrito (aparecerá vacío)
        alert('Carrito vaciado.');
    };

    // --- Event Listener para el botón "Vaciar Carrito" ---
    clearCartBtn.addEventListener('click', clearCart);

    // --- Event Listener para el botón "Finalizar Compra" ---
    finalizePurchaseBtn.addEventListener('click', () => {
        if (cart.length === 0) {
            alert('El carrito está vacío. Agrega productos antes de finalizar la compra.');
            return;
        }
        if (!isLoggedIn || userRole !== 'user') {
            alert('Debes iniciar sesión como usuario para finalizar la compra.');
            window.location.href = 'login-form.html'; // Redirige al login si no está logueado
            return;
        }

        // Prepara los datos del pedido para enviar al backend
        const pedidoItems = cart.map(item => ({
            fecha: getCurrentDate(),
            cliente: loggedInUsername, // Nombre de usuario logueado como cliente
            producto: item.id, // ID del producto
            precio: item.precio,
            cantidad: item.cantidad,
            nropedido: generateNroPedido(), // Asegura que todos los ítems tengan el mismo número de pedido
            nombreCliente: loggedInUsername // Nombre del cliente
        }));

        sendPurchaseOrder(pedidoItems);
    });

    /**
     * Envía la orden de compra al backend a través del endpoint de batch pedidos.
     * @param {Array<object>} orderItems Un array de objetos que representan los ítems del pedido.
     */
    const sendPurchaseOrder = (orderItems) => {
        const csrfToken = getCookie('XSRF-TOKEN'); // Obtiene el token CSRF para seguridad

        fetch(endpointBatchPedido, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-XSRF-TOKEN': csrfToken // Envía el token CSRF en los headers
            },
            body: JSON.stringify(orderItems) // Convierte el array de ítems a una cadena JSON
        })
        .then(response => {
            if (!response.ok) {
                // Si la respuesta no es OK (ej. 4xx, 5xx), intenta leer el mensaje de error del backend
                return response.json().catch(() => ({ message: 'Error desconocido al procesar la compra.' }))
                                      .then(err => { throw new Error(err.message || 'Error en la respuesta del servidor.'); });
            }
            return response.json(); // Parsea la respuesta JSON del backend
        })
        .then(data => {
            alert('¡Compra finalizada con éxito!');
            console.log('Respuesta del pedido:', data); // Muestra la respuesta del backend en consola
            clearCart(); // Vacía el carrito después de una compra exitosa
            // Aquí podrías añadir una redirección a una página de confirmación, mostrar un modal, etc.
        })
        .catch(error => {
            console.error('Error al finalizar la compra:', error);
            alert(`No se pudo finalizar la compra: ${error.message}`);
        });
    };

    // --- Funciones de Carga y Eliminación de Productos ---

    /**
     * Obtiene la lista de productos del backend y los renderiza en la página.
     * Ajusta la visibilidad de los botones de administración y compra dinámicamente.
     */
    const fetchProducts = () => {
        productosListaDiv.innerHTML = '<p>Cargando productos...</p>'; // Muestra un mensaje de carga
        errorMessageDiv.style.display = 'none'; // Oculta mensajes de error previos

        fetch(endpointList)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json(); // Parsea la respuesta JSON
            })
            .then(productos => {
                productosListaDiv.innerHTML = ''; // Limpia el mensaje "Cargando..."

                if (productos.length === 0) {
                    productosListaDiv.innerHTML = '<p>No hay productos disponibles en este momento.</p>';
                    // Aún si no hay productos, actualizamos la visibilidad por si hay otros elementos
                    updateProductCardButtonsVisibility();
                    return;
                }

                productos.forEach(producto => {
                    const productoCard = document.createElement('div');
                    productoCard.classList.add('producto-card');

                    // Plantilla HTML para cada tarjeta de producto
                    productoCard.innerHTML = `
                        <h2>${producto.nombre}</h2>
                        <p><strong>ID:</strong> ${producto.id}</p>
                        <p><strong>Descripción:</strong> ${producto.descripcion}</p>
                        <p><strong>Categoría:</strong> ${producto.categoria}</p>
                        <p><strong>Stock:</strong> ${producto.stock}</p>
                        <p class="precio"><strong>Precio:</strong> ${formatPrice(producto.precio)}</p>
                        ${producto.url_imagen ? `<img src="${producto.url_imagen}" alt="${producto.nombre}" style="max-width: 100%; height: auto; border-radius: 4px; margin-top: 10px;">` : ''}
                        
                        <div class="buy-controls">
                            <input type="number" id="quantity-${producto.id}" value="1" min="1" max="${producto.stock}" title="Cantidad">
                            <button class="btn-primary add-to-cart-btn" data-product-id="${producto.id}"
                                data-product-name="${producto.nombre}"
                                data-product-price="${producto.precio}">
                                Comprar
                            </button>
                        </div>

                        <div class="actions">
                            <a href="product-form.html?id=${producto.id}" class="btn-secondary">Modificar</a>
                            <button class="btn-danger delete-btn" data-id="${producto.id}">Eliminar</button>
                        </div>
                    `;
                    productosListaDiv.appendChild(productoCard);
                });

                // ¡IMPORTANTE! Llama a la función para actualizar la visibilidad
                // DESPUÉS de que todas las tarjetas han sido añadidas al DOM.
                updateProductCardButtonsVisibility();

                // Adjuntar event listeners para los botones "Comprar"
                document.querySelectorAll('.add-to-cart-btn').forEach(button => {
                    button.addEventListener('click', (event) => {
                        const productId = parseInt(event.target.dataset.productId);
                        const productName = event.target.dataset.productName;
                        const productPrice = parseFloat(event.target.dataset.productPrice);
                        
                        addItemToCart({
                            id: productId,
                            nombre: productName,
                            precio: productPrice
                        });
                    });
                });

                // Adjuntar event listeners para los botones de "Eliminar" (solo si el rol lo permite)
                document.querySelectorAll('.delete-btn').forEach(button => {
                    button.addEventListener('click', (event) => {
                        if (!isLoggedIn || userRole !== 'admin') {
                            alert('Acceso denegado. Solo administradores pueden eliminar productos.');
                            return;
                        }
                        const productId = event.target.dataset.id;
                        if (confirm(`¿Estás seguro de que quieres eliminar el producto con ID: ${productId}?`)) {
                            deleteProduct(productId);
                        }
                    });
                });

                // Adjuntar event listeners para los enlaces "Modificar" (solo si el rol lo permite)
                document.querySelectorAll('.actions .btn-secondary').forEach(link => {
                    link.addEventListener('click', (event) => {
                        if (!isLoggedIn || userRole !== 'admin') {
                            alert('Acceso denegado. Solo administradores pueden modificar productos.');
                            event.preventDefault(); // Previene la navegación si no es admin
                        }
                    });
                });
            })
            .catch(error => {
                console.error('Error al cargar los productos:', error);
                productosListaDiv.innerHTML = '<p class="error-message">Error al cargar los productos. Por favor, intenta de nuevo más tarde.</p>';
                errorMessageDiv.style.display = 'block'; // Muestra el mensaje de error general
            });
    };

    /**
     * Elimina un producto del backend por su ID.
     * Solo permite la eliminación si el usuario es un administrador logueado.
     * @param {number} id El ID del producto a eliminar.
     */
    const deleteProduct = (id) => {
        if (!isLoggedIn || userRole !== 'admin') {
            alert('Acceso denegado. Solo administradores pueden eliminar productos.');
            return;
        }

        const csrfToken = getCookie('XSRF-TOKEN');

        fetch(endpointDelete + id, {
            method: 'DELETE',
            headers: {
                'X-XSRF-TOKEN': csrfToken // Envía el token CSRF
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().catch(() => ({ message: 'Error desconocido al eliminar el producto.' }))
                                      .then(err => { throw new Error(err.message || 'Error en la respuesta del servidor.'); });
            }
            console.log(`Producto con ID ${id} eliminado correctamente.`);
            fetchProducts(); // Recarga la lista de productos para actualizar la UI
        })
        .catch(error => {
            console.error('Error al eliminar el producto:', error);
            alert(`No se pudo eliminar el producto: ${error.message}`);
        });
    };

    // --- Event Listener para el botón del Carrito (mostrar/ocultar) ---
    toggleCartBtn.addEventListener('click', () => {
        shoppingCartSidebar.classList.toggle('hidden'); // Alterna la clase 'hidden'
    });

    // --- Inicialización de la Aplicación ---
    // Esta sección se ejecuta cuando el DOM está completamente cargado.
    checkLoginStatus(); // 1. Verifica el estado de login y establece el rol.
    fetchProducts();    // 2. Carga los productos, los renderiza y actualiza la visibilidad de los botones.
    renderCart();       // 3. Renderiza el carrito de compras (desde `localStorage`).
});