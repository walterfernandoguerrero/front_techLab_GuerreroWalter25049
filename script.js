document.addEventListener('DOMContentLoaded', () => {
    const productosListaDiv = document.getElementById('productos-lista');
    const errorMessageDiv = document.getElementById('error-message');
    const loginLogoutBtn = document.getElementById('login-logout-btn');
    const addBtnContainer = document.getElementById('add-btn-container');
    const toggleCartBtn = document.getElementById('toggle-cart-btn'); // Nuevo
    const shoppingCartSidebar = document.getElementById('shopping-cart-sidebar'); // Nuevo
    const cartItemsDiv = document.getElementById('cart-items'); // Nuevo
    const cartItemCountSpan = document.getElementById('cart-item-count'); // Nuevo
    const cartTotalPriceSpan = document.getElementById('cart-total-price'); // Nuevo
    const finalizePurchaseBtn = document.getElementById('finalize-purchase-btn'); // Nuevo
    const clearCartBtn = document.getElementById('clear-cart-btn'); // Nuevo

    const endpointList = 'http://localhost:8080/producto/list';
    const endpointDelete = 'http://localhost:8080/producto/delete/';
    const endpointBatchPedido = 'http://localhost:8080/pedido/batchPedidos'; // Nuevo endpoint para pedidos

    let carrito = []; // Array para almacenar los productos en el carrito
    let nroPedidoGlobal = null; // Para asegurar que todos los ítems de un mismo pedido tengan el mismo nro

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

    const getCurrentDate = () => {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0'); // Enero es 0!
        const yyyy = today.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    };

    // --- Lógica de Sesión ---
    let isLoggedIn = false;
    let loggedInUsername = null; // Almacena el nombre de usuario para el campo 'cliente'

    const checkLoginStatus = () => {
        const loggedInUser = sessionStorage.getItem('loggedInUser');
        if (loggedInUser) {
            isLoggedIn = true;
            loggedInUsername = loggedInUser; // Guarda el nombre de usuario
            loginLogoutBtn.textContent = 'Salir';
            addBtnContainer.style.display = 'block';
        } else {
            isLoggedIn = false;
            loggedInUsername = null;
            loginLogoutBtn.textContent = 'Ingresar';
            addBtnContainer.style.display = 'none';
        }
        updateProductCardButtonsVisibility();
    };

    const login = (username) => {
        sessionStorage.setItem('loggedInUser', username);
        checkLoginStatus();
        alert(`¡Bienvenido, ${username}!`);
        // No redirigir aquí, dejar que el login-form.js lo haga para controlar el flujo
    };

    const logout = () => {
        sessionStorage.removeItem('loggedInUser');
        isLoggedIn = false;
        loggedInUsername = null; // Limpiar el nombre de usuario
        loginLogoutBtn.textContent = 'Ingresar';
        addBtnContainer.style.display = 'none';
        updateProductCardButtonsVisibility();
        alert('Has cerrado sesión.');
        window.location.href = 'index.html';
    };

    loginLogoutBtn.addEventListener('click', () => {
        if (isLoggedIn) {
            logout();
        } else {
            window.location.href = 'login-form.html';
        }
    });

    const updateProductCardButtonsVisibility = () => {
        document.querySelectorAll('.producto-card .actions').forEach(actionsContainer => {
            if (isLoggedIn) {
                actionsContainer.classList.add('visible');
            } else {
                actionsContainer.classList.remove('visible');
            }
        });
        // Deshabilita los botones de agregar al carrito si no está logueado
        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            if (!isLoggedIn) {
                button.setAttribute('disabled', 'true');
            } else {
                button.removeAttribute('disabled');
            }
        });
    };

    // --- Lógica del Carrito ---

    // Función para generar un nropedido único para la sesión (solo si no hay uno)
    const generateNroPedido = () => {
        if (!nroPedidoGlobal) {
            // Usamos un timestamp + un número aleatorio para mayor unicidad
            nroPedidoGlobal = Date.now() + Math.floor(Math.random() * 1000);
            console.log("Generado nuevo NroPedido:", nroPedidoGlobal);
        }
        return nroPedidoGlobal;
    };

    // Función para renderizar el carrito
    const renderCart = () => {
        cartItemsDiv.innerHTML = '';
        let total = 0;

        if (carrito.length === 0) {
            cartItemsDiv.innerHTML = '<p>El carrito está vacío.</p>';
            finalizePurchaseBtn.style.display = 'none';
            clearCartBtn.style.display = 'none';
        } else {
            carrito.forEach((item, index) => {
                const itemTotal = item.precio * item.cantidad;
                total += itemTotal;

                const cartItemCard = document.createElement('div');
                cartItemCard.classList.add('cart-item-card');
                cartItemCard.innerHTML = `
                    <div class="cart-item-info">
                        <p><strong>${item.nombreProducto}</strong></p>
                        <p>Cant: ${item.cantidad} x ${formatPrice(item.precio)} = ${formatPrice(itemTotal)}</p>
                    </div>
                    <button class="cart-item-remove" data-index="${index}">X</button>
                `;
                cartItemsDiv.appendChild(cartItemCard);
            });
            finalizePurchaseBtn.style.display = 'block';
            clearCartBtn.style.display = 'block';
        }

        cartItemCountSpan.textContent = carrito.length;
        cartTotalPriceSpan.textContent = formatPrice(total);

        // Adjuntar listeners para eliminar ítems del carrito
        document.querySelectorAll('.cart-item-remove').forEach(button => {
            button.addEventListener('click', (event) => {
                const indexToRemove = parseInt(event.target.dataset.index);
                removeItemFromCart(indexToRemove);
            });
        });
    };

    const addItemToCart = (product) => {
        const quantityInput = document.getElementById(`quantity-${product.id}`);
        const quantity = parseInt(quantityInput.value);

        if (isNaN(quantity) || quantity <= 0) {
            alert('Por favor, ingrese una cantidad válida.');
            return;
        }

        // Buscar si el producto ya está en el carrito para actualizar la cantidad
        const existingItemIndex = carrito.findIndex(item => item.id === product.id);

        if (existingItemIndex > -1) {
            // Si ya existe, actualiza la cantidad
            carrito[existingItemIndex].cantidad += quantity;
            alert(`Cantidad de "${product.nombre}" actualizada en el carrito.`);
        } else {
            // Si no existe, lo añade como nuevo ítem
            carrito.push({
                id: product.id,
                nombreProducto: product.nombre, // Para mostrar en el carrito
                precio: product.precio,
                cantidad: quantity
            });
            alert(`"${product.nombre}" añadido al carrito.`);
        }

        renderCart();
    };

    const removeItemFromCart = (index) => {
        carrito.splice(index, 1); // Elimina el ítem del array
        renderCart(); // Vuelve a renderizar el carrito
        alert('Producto eliminado del carrito.');
    };

    const clearCart = () => {
        carrito = [];
        nroPedidoGlobal = null; // Reiniciar el nro de pedido al vaciar el carrito
        renderCart();
        alert('Carrito vaciado.');
    };

    // --- Event Listener para el botón "Vaciar Carrito" ---
    clearCartBtn.addEventListener('click', clearCart);

    // --- Event Listener para el botón "Finalizar Compra" ---
    finalizePurchaseBtn.addEventListener('click', () => {
        if (carrito.length === 0) {
            alert('El carrito está vacío. Añade productos antes de finalizar la compra.');
            return;
        }
        if (!isLoggedIn) {
            alert('Debes iniciar sesión para finalizar la compra.');
            window.location.href = 'login-form.html';
            return;
        }
        
        // Preparar los datos del pedido
        const pedidoItems = carrito.map(item => ({
            fecha: getCurrentDate(), // Fecha actual del sistema
            cliente: loggedInUsername, // Nombre de usuario logueado como cliente
            producto: item.id, // ID del producto
            precio: item.precio,
            cantidad: item.cantidad,
            nropedido: generateNroPedido(), // Asegura que todos tengan el mismo nro de pedido
            nombreCliente: loggedInUsername // Nombre del cliente
        }));

        sendPurchaseOrder(pedidoItems);
    });

    const sendPurchaseOrder = (orderItems) => {
        const csrfToken = getCookie('XSRF-TOKEN');

        fetch(endpointBatchPedido, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-XSRF-TOKEN': csrfToken
            },
            body: JSON.stringify(orderItems)
        })
        .then(response => {
            if (!response.ok) {
                // Intenta leer el mensaje de error del backend
                return response.json().catch(() => ({ message: 'Error desconocido al procesar la compra.' }))
                               .then(err => { throw new Error(err.message || 'Error en la respuesta del servidor.'); });
            }
            return response.json(); // El backend podría devolver los pedidos guardados
        })
        .then(data => {
            alert('¡Compra finalizada con éxito!');
            console.log('Respuesta del pedido:', data);
            clearCart(); // Vaciar el carrito después de una compra exitosa
            // Puedes redirigir a una página de confirmación si lo deseas
        })
        .catch(error => {
            console.error('Error al finalizar la compra:', error);
            alert(`No se pudo finalizar la compra: ${error.message}`);
        });
    };


    // --- Funciones de Carga y Eliminación de Productos (Modificadas) ---
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

                updateProductCardButtonsVisibility(); // Actualiza la visibilidad de los botones admin/comprar

                // Añadir event listeners para los botones "Comprar"
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

                // Añadir event listeners para los botones de eliminar (solo si está logueado)
                document.querySelectorAll('.delete-btn').forEach(button => {
                    if (isLoggedIn) {
                        button.addEventListener('click', (event) => {
                            const productId = event.target.dataset.id;
                            if (confirm(`¿Estás seguro de que quieres eliminar el producto con ID: ${productId}?`)) {
                                deleteProduct(productId);
                            }
                        });
                    } else {
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

    // --- Event Listener para el botón de Carrito ---
    toggleCartBtn.addEventListener('click', () => {
        shoppingCartSidebar.classList.toggle('hidden');
    });

    // --- Inicialización ---
    checkLoginStatus();
    fetchProducts();
    renderCart(); // Asegura que el carrito se muestre vacío al inicio
});